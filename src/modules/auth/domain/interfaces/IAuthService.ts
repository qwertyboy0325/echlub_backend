import { User } from '../../../../core/domain/entities/User';

export interface IAuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface IAuthenticationResult {
    user: User;
    tokens: IAuthTokens;
}

export interface IAuthService {
    hashPassword(password: string): Promise<string>;
    comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean>;
    generateTokens(userId: string, email: string): IAuthTokens;
    verifyAccessToken(token: string): Promise<{ userId: string; email: string } | null>;
    verifyRefreshToken(token: string): Promise<{ userId: string; email: string } | null>;
} 