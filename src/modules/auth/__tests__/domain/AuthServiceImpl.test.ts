import { AuthServiceImpl } from '../../domain/services/AuthServiceImpl';
import { AppError } from '../../../../shared/domain/AppError';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthServiceImpl', () => {
    let authService: AuthServiceImpl;
    const mockJwtSecret = 'test_secret';
    const mockJwtRefreshSecret = 'test_refresh_secret';
    const mockJwtExpiresIn = 3600;
    const mockJwtRefreshExpiresIn = 604800;

    beforeEach(() => {
        jest.clearAllMocks();
        authService = new AuthServiceImpl(
            mockJwtSecret,
            mockJwtRefreshSecret,
            mockJwtExpiresIn,
            mockJwtRefreshExpiresIn
        );
    });

    describe('hashPassword', () => {
        it('should hash password correctly', async () => {
            const plainPassword = 'test_password';
            const hashedPassword = 'hashed_password';
            
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
            
            const result = await authService.hashPassword(plainPassword);
            
            expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
            expect(result).toBe(hashedPassword);
        });

        it('should throw AppError when hashing fails', async () => {
            const plainPassword = 'test_password';
            
            (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));
            
            await expect(authService.hashPassword(plainPassword)).rejects.toThrow(AppError);
            await expect(authService.hashPassword(plainPassword)).rejects.toThrow('Failed to hash password');
        });
    });

    describe('comparePasswords', () => {
        it('should return true when passwords match', async () => {
            const plainPassword = 'test_password';
            const hashedPassword = 'hashed_password';
            
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            
            const result = await authService.comparePasswords(plainPassword, hashedPassword);
            
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(true);
        });

        it('should return false when passwords do not match', async () => {
            const plainPassword = 'test_password';
            const hashedPassword = 'hashed_password';
            
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            
            const result = await authService.comparePasswords(plainPassword, hashedPassword);
            
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
            expect(result).toBe(false);
        });

        it('should throw AppError when comparison fails', async () => {
            const plainPassword = 'test_password';
            const hashedPassword = 'hashed_password';
            
            (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Comparison failed'));
            
            await expect(authService.comparePasswords(plainPassword, hashedPassword)).rejects.toThrow(AppError);
            await expect(authService.comparePasswords(plainPassword, hashedPassword)).rejects.toThrow('Failed to compare passwords');
        });
    });

    describe('generateTokens', () => {
        it('should generate access and refresh tokens correctly', () => {
            const userId = 'test_user_id';
            const email = 'test@example.com';
            const accessToken = 'access_token';
            const refreshToken = 'refresh_token';
            
            (jwt.sign as jest.Mock).mockReturnValueOnce(accessToken).mockReturnValueOnce(refreshToken);
            
            const result = authService.generateTokens(userId, email);
            
            expect(jwt.sign).toHaveBeenCalledTimes(2);
            expect(jwt.sign).toHaveBeenNthCalledWith(1, { userId, email }, mockJwtSecret, { expiresIn: mockJwtExpiresIn });
            expect(jwt.sign).toHaveBeenNthCalledWith(2, { userId, email }, mockJwtRefreshSecret, { expiresIn: mockJwtRefreshExpiresIn });
            expect(result).toEqual({ accessToken, refreshToken });
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify access token and return payload when valid', async () => {
            const token = 'valid_token';
            const decoded = { userId: 'user_id', email: 'test@example.com' };
            
            (jwt.verify as jest.Mock).mockReturnValue(decoded);
            
            const result = await authService.verifyAccessToken(token);
            
            expect(jwt.verify).toHaveBeenCalledWith(token, mockJwtSecret);
            expect(result).toEqual(decoded);
        });

        it('should return null when token is invalid', async () => {
            const token = 'invalid_token';
            
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });
            
            const result = await authService.verifyAccessToken(token);
            
            expect(jwt.verify).toHaveBeenCalledWith(token, mockJwtSecret);
            expect(result).toBeNull();
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify refresh token and return payload when valid', async () => {
            const token = 'valid_refresh_token';
            const decoded = { userId: 'user_id', email: 'test@example.com' };
            
            (jwt.verify as jest.Mock).mockReturnValue(decoded);
            
            const result = await authService.verifyRefreshToken(token);
            
            expect(jwt.verify).toHaveBeenCalledWith(token, mockJwtRefreshSecret);
            expect(result).toEqual(decoded);
        });

        it('should return null when refresh token is invalid', async () => {
            const token = 'invalid_refresh_token';
            
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });
            
            const result = await authService.verifyRefreshToken(token);
            
            expect(jwt.verify).toHaveBeenCalledWith(token, mockJwtRefreshSecret);
            expect(result).toBeNull();
        });
    });
}); 