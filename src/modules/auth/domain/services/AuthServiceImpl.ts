import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IAuthService, IAuthTokens } from '../interfaces/IAuthService';
import { AppError } from '../../../../shared/domain/AppError';

export class AuthServiceImpl implements IAuthService {
    constructor(
        private readonly jwtSecret: string = process.env.JWT_SECRET || 'default_secret',
        private readonly jwtRefreshSecret: string = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        private readonly jwtExpiresIn: number = parseInt(process.env.JWT_EXPIRATION || '3600'),
        private readonly jwtRefreshExpiresIn: number = parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800')
    ) {}
    
    async hashPassword(password: string): Promise<string> {
        try {
            return await bcrypt.hash(password, 10);
        } catch (error) {
            throw new AppError('Failed to hash password', 500);
        }
    }
    
    async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new AppError('Failed to compare passwords', 500);
        }
    }
    
    generateTokens(userId: string, email: string): IAuthTokens {
        const payload = { userId, email };
        
        const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
        const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: this.jwtRefreshExpiresIn });
        
        return { accessToken, refreshToken };
    }
    
    async verifyAccessToken(token: string): Promise<{ userId: string; email: string } | null> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; email: string };
            return decoded;
        } catch (error) {
            return null;
        }
    }
    
    async verifyRefreshToken(token: string): Promise<{ userId: string; email: string } | null> {
        try {
            const decoded = jwt.verify(token, this.jwtRefreshSecret) as { userId: string; email: string };
            return decoded;
        } catch (error) {
            return null;
        }
    }
} 