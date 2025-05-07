import request from 'supertest';
import express from 'express';
import { AuthController } from '../../presentation/controllers/AuthController';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/RefreshTokenUseCase';
import { LogoutUserUseCase } from '../../application/use-cases/LogoutUserUseCase';
import { AuthServiceImpl } from '../../domain/services/AuthServiceImpl';
import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { User } from '../../../../core/domain/entities/User';
import jwt from 'jsonwebtoken';
import { AppError } from '../../../../shared/domain/AppError';
import { errorHandlerMiddleware } from '../../../../shared/infrastructure/middlewares/errorHandlerMiddleware';

// 為測試創建自定義的JWT驗證中間件
const testAuthenticateJwt = (req: express.Request, _res: express.Response, next: express.NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        throw new AppError('Authorization header is required', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        throw new AppError('Bearer token is required', 401);
    }
    
    try {
        // 確保使用與AuthServiceImpl相同的測試密鑰
        const decoded = jwt.verify(token, 'test_secret') as { userId: string; email: string };
        
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };
        
        next();
    } catch (error) {
        throw new AppError('Invalid token', 401);
    }
};

// 建立模擬存儲庫
class InMemoryUserRepository implements IUserRepository {
    private users: Map<string, User> = new Map();
    private usersByEmail: Map<string, User> = new Map();
    private usersByRefreshToken: Map<string, User> = new Map();
    
    async save(user: User): Promise<void> {
        this.users.set(user.id, user);
        this.usersByEmail.set(user.email, user);
        
        // 首先移除與該用戶相關的所有refreshToken映射
        for (const [token, storedUser] of this.usersByRefreshToken.entries()) {
            if (storedUser.id === user.id) {
                this.usersByRefreshToken.delete(token);
            }
        }
        
        // 只有當用戶有新的refreshToken時，才添加新的映射
        if (user.refreshToken) {
            this.usersByRefreshToken.set(user.refreshToken, user);
        }
    }
    
    async findById(id: string): Promise<User | null> {
        return this.users.get(id) || null;
    }
    
    async findByEmail(email: string): Promise<User | null> {
        return this.usersByEmail.get(email) || null;
    }
    
    async findByRefreshToken(refreshToken: string): Promise<User | null> {
        return this.usersByRefreshToken.get(refreshToken) || null;
    }
    
    async delete(id: string): Promise<void> {
        const user = this.users.get(id);
        
        if (user) {
            this.users.delete(id);
            this.usersByEmail.delete(user.email);
            
            if (user.refreshToken) {
                this.usersByRefreshToken.delete(user.refreshToken);
            }
        }
    }
}

describe('Auth Flow Integration Tests', () => {
    let app: express.Application;
    let authService: AuthServiceImpl;
    let userRepository: InMemoryUserRepository;
    let registerUseCase: RegisterUserUseCase;
    let loginUseCase: LoginUserUseCase;
    let refreshTokenUseCase: RefreshTokenUseCase;
    let logoutUseCase: LogoutUserUseCase;
    let authController: AuthController;
    
    beforeAll(() => {
        // 建立應用和依賴
        app = express();
        app.use(express.json());
        
        // 初始化依賴 - 確保使用相同的測試密鑰
        authService = new AuthServiceImpl('test_secret', 'test_refresh_secret');
        userRepository = new InMemoryUserRepository();
        
        // 創建用例
        registerUseCase = new RegisterUserUseCase(userRepository, authService);
        loginUseCase = new LoginUserUseCase(userRepository, authService);
        refreshTokenUseCase = new RefreshTokenUseCase(userRepository, authService);
        logoutUseCase = new LogoutUserUseCase(userRepository);
        
        // 創建控制器
        authController = new AuthController(
            registerUseCase,
            loginUseCase,
            refreshTokenUseCase,
            logoutUseCase
        );
        
        // 設置路由
        app.post('/api/auth/register', (req, res, next) => authController.register(req, res, next));
        app.post('/api/auth/login', (req, res, next) => authController.login(req, res, next));
        app.post('/api/auth/refresh-token', (req, res, next) => authController.refreshToken(req, res, next));
        app.post('/api/auth/logout', testAuthenticateJwt, (req, res, next) => authController.logout(req, res, next));
        
        // 錯誤處理
        app.use(errorHandlerMiddleware);
    });
    
    it('should allow a user to register, login, refresh token, and logout', async () => {
        // 註冊新用戶
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            });
        
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body).toHaveProperty('accessToken');
        expect(registerResponse.body).toHaveProperty('refreshToken');
        expect(registerResponse.body).toHaveProperty('user');
        // 只檢查user對象存在
        expect(registerResponse.body.user).toBeTruthy();
        
        const { accessToken, refreshToken } = registerResponse.body;
        
        // 使用訪問令牌訪問受保護的路由
        const logoutResponse = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(logoutResponse.status).toBe(204);
        
        // 嘗試用舊的刷新令牌獲取新的令牌（應該失敗，因為我們已登出）
        const refreshResponse = await request(app)
            .post('/api/auth/refresh-token')
            .send({ refreshToken });
        
        // 登出後使用刷新令牌應該失敗
        expect(refreshResponse.status).toBe(401);
        
        // 再次登錄
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'Password123!'
            });
        
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty('accessToken');
        expect(loginResponse.body).toHaveProperty('refreshToken');
    });
    
    it('should reject login with invalid credentials', async () => {
        // 嘗試使用錯誤的密碼登錄
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'WrongPassword123!'
            });
        
        expect(loginResponse.status).toBe(401);
        expect(loginResponse.body).toHaveProperty('message', 'Invalid credentials');
    });
    
    it('should reject registration with existing email', async () => {
        // 嘗試使用已存在的電子郵件註冊
        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'test@example.com',
                password: 'AnotherPassword123!',
                firstName: 'Another',
                lastName: 'User'
            });
        
        expect(registerResponse.status).toBe(400);
        expect(registerResponse.body).toHaveProperty('message', 'Email already exists');
    });
}); 