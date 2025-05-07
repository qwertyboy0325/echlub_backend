import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase, RegisterUserDTO } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase, LoginUserDTO } from '../../application/use-cases/LoginUserUseCase';
import { RefreshTokenUseCase, RefreshTokenDTO } from '../../application/use-cases/RefreshTokenUseCase';
import { LogoutUserUseCase, LogoutUserDTO } from '../../application/use-cases/LogoutUserUseCase';
import { AppError } from '../../../../shared/domain/AppError';

export class AuthController {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUserUseCase: LoginUserUseCase,
        private readonly refreshTokenUseCase: RefreshTokenUseCase,
        private readonly logoutUserUseCase: LogoutUserUseCase
    ) {}
    
    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Register a new user
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *               - firstName
     *               - lastName
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *               password:
     *                 type: string
     *                 format: password
     *                 description: User's password
     *               firstName:
     *                 type: string
     *                 description: User's first name
     *               lastName:
     *                 type: string
     *                 description: User's last name
     *     responses:
     *       201:
     *         description: User registered successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     email:
     *                       type: string
     *                     firstName:
     *                       type: string
     *                     lastName:
     *                       type: string
     *                 accessToken:
     *                   type: string
     *                 refreshToken:
     *                   type: string
     *       400:
     *         description: Invalid input
     *       409:
     *         description: Email already exists
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password, firstName, lastName } = req.body;
            
            const dto: RegisterUserDTO = {
                email,
                password,
                firstName,
                lastName
            };
            
            const result = await this.registerUserUseCase.execute(dto);
            
            const { password: _, refreshToken: __, ...userWithoutSensitiveInfo } = result.user as any;
            
            res.status(201).json({
                user: userWithoutSensitiveInfo,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken
            });
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Login with email and password
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *               password:
     *                 type: string
     *                 format: password
     *                 description: User's password
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 user:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     email:
     *                       type: string
     *                     firstName:
     *                       type: string
     *                     lastName:
     *                       type: string
     *                 accessToken:
     *                   type: string
     *                 refreshToken:
     *                   type: string
     *       400:
     *         description: Invalid credentials
     *       401:
     *         description: Authentication failed
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;
            
            const dto: LoginUserDTO = {
                email,
                password
            };
            
            const result = await this.loginUserUseCase.execute(dto);
            
            const { password: _, refreshToken: __, ...userWithoutSensitiveInfo } = result.user as any;
            
            res.status(200).json({
                user: userWithoutSensitiveInfo,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken
            });
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * @swagger
     * /api/auth/refresh-token:
     *   post:
     *     summary: Refresh access token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - refreshToken
     *             properties:
     *               refreshToken:
     *                 type: string
     *                 description: Refresh token received during login or registration
     *     responses:
     *       200:
     *         description: Token refresh successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 accessToken:
     *                   type: string
     *                 refreshToken:
     *                   type: string
     *       400:
     *         description: Invalid refresh token
     *       401:
     *         description: Refresh token expired or invalid
     */
    async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                throw new AppError('Refresh token is required', 400);
            }
            
            const dto: RefreshTokenDTO = {
                refreshToken
            };
            
            const tokens = await this.refreshTokenUseCase.execute(dto);
            
            res.status(200).json(tokens);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: Logout user
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       204:
     *         description: Logout successful, no content
     *       401:
     *         description: Not authenticated
     */
    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            
            if (!userId) {
                throw new AppError('User ID is required', 400);
            }
            
            const dto: LogoutUserDTO = {
                userId
            };
            
            await this.logoutUserUseCase.execute(dto);
            
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
} 