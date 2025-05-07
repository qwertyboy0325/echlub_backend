import { LoginUserUseCase, LoginUserDTO } from '../../application/use-cases/LoginUserUseCase';
import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { IAuthService } from '../../domain/interfaces/IAuthService';
import { User } from '../../../../core/domain/entities/User';
import { AppError } from '../../../../shared/domain/AppError';
import * as validators from '../../application/validators/auth.validator';

// Mock validators
jest.mock('../../application/validators/auth.validator');

describe('LoginUserUseCase', () => {
    let loginUserUseCase: LoginUserUseCase;
    let mockUserRepository: jest.Mocked<IUserRepository>;
    let mockAuthService: jest.Mocked<IAuthService>;
    let mockValidateEmail: jest.SpyInstance;
    
    beforeEach(() => {
        // Mock validators
        mockValidateEmail = jest.spyOn(validators, 'validateEmail').mockImplementation(() => {});
        
        // Create mock repository and service
        mockUserRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByRefreshToken: jest.fn(),
            delete: jest.fn()
        };
        
        mockAuthService = {
            hashPassword: jest.fn(),
            comparePasswords: jest.fn(),
            generateTokens: jest.fn(),
            verifyAccessToken: jest.fn(),
            verifyRefreshToken: jest.fn()
        };
        
        loginUserUseCase = new LoginUserUseCase(mockUserRepository, mockAuthService);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    it('should validate email format during login', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'test@example.com',
            password: 'password123'
        };
        
        const mockUser = {
            id: 'user-id',
            email: dto.email,
            password: 'hashed_password',
            isActive: true,
            withUpdatedRefreshToken: jest.fn().mockReturnThis()
        } as unknown as User;
        
        mockUserRepository.findByEmail.mockResolvedValue(mockUser);
        mockAuthService.comparePasswords.mockResolvedValue(true);
        mockAuthService.generateTokens.mockReturnValue({
            accessToken: 'access_token',
            refreshToken: 'refresh_token'
        });
        
        // Act
        await loginUserUseCase.execute(dto);
        
        // Assert
        expect(mockValidateEmail).toHaveBeenCalledWith(dto.email);
    });
    
    it('should throw validation error for invalid email format', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'invalid-email',
            password: 'password123'
        };
        
        // Mock validation to throw error
        mockValidateEmail.mockImplementation(() => {
            throw new AppError('Invalid email format', 400);
        });
        
        // Act & Assert
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow('Invalid email format');
        expect(mockValidateEmail).toHaveBeenCalledWith(dto.email);
        
        // Verify repository methods were not called
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
    
    it('should throw error if password is missing', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'test@example.com',
            password: ''
        };
        
        // Act & Assert
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow('Password is required');
    });
    
    it('should throw an error if user does not exist', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'nonexistent@example.com',
            password: 'password123'
        };
        
        mockUserRepository.findByEmail.mockResolvedValue(null);
        
        // Act & Assert
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow('Invalid credentials');
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
    });
    
    it('should throw an error if password is incorrect', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'user@example.com',
            password: 'incorrect_password'
        };
        
        const mockUser = {
            id: 'user-id',
            email: dto.email,
            password: 'hashed_correct_password'
        } as User;
        
        mockUserRepository.findByEmail.mockResolvedValue(mockUser);
        mockAuthService.comparePasswords.mockResolvedValue(false);
        
        // Act & Assert
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow('Invalid credentials');
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
        expect(mockAuthService.comparePasswords).toHaveBeenCalledWith(dto.password, mockUser.password);
    });
    
    it('should throw an error if user account is not active', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'inactive@example.com',
            password: 'password123'
        };
        
        const mockUser = {
            id: 'user-id',
            email: dto.email,
            password: 'hashed_password',
            isActive: false
        } as User;
        
        mockUserRepository.findByEmail.mockResolvedValue(mockUser);
        mockAuthService.comparePasswords.mockResolvedValue(true);
        
        // Act & Assert
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(loginUserUseCase.execute(dto)).rejects.toThrow('Account is not active');
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
        expect(mockAuthService.comparePasswords).toHaveBeenCalledWith(dto.password, mockUser.password);
    });
    
    it('should login user successfully', async () => {
        // Arrange
        const dto: LoginUserDTO = {
            email: 'active@example.com',
            password: 'correct_password'
        };
        
        const mockUser = {
            id: 'user-id',
            email: dto.email,
            password: 'hashed_password',
            isActive: true,
            withUpdatedRefreshToken: jest.fn().mockReturnThis()
        } as unknown as User;
        
        const tokens = {
            accessToken: 'access_token',
            refreshToken: 'refresh_token'
        };
        
        mockUserRepository.findByEmail.mockResolvedValue(mockUser);
        mockAuthService.comparePasswords.mockResolvedValue(true);
        mockAuthService.generateTokens.mockReturnValue(tokens);
        
        // Act
        const result = await loginUserUseCase.execute(dto);
        
        // Assert
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
        expect(mockAuthService.comparePasswords).toHaveBeenCalledWith(dto.password, mockUser.password);
        expect(mockAuthService.generateTokens).toHaveBeenCalledWith(mockUser.id, mockUser.email);
        expect(mockUser.withUpdatedRefreshToken).toHaveBeenCalledWith(tokens.refreshToken);
        expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
        
        // Verify result
        expect(result).toEqual({
            user: mockUser,
            tokens
        });
    });
}); 