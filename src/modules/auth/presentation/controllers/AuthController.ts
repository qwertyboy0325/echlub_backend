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