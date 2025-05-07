import { RegisterUserUseCase, RegisterUserDTO } from '../../application/use-cases/RegisterUserUseCase';
import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { IAuthService } from '../../domain/interfaces/IAuthService';
import { User } from '../../../../core/domain/entities/User';
import { AppError } from '../../../../shared/domain/AppError';
import { v4 as uuidv4 } from 'uuid';
import * as validators from '../../application/validators/auth.validator';

// Mock dependencies
jest.mock('uuid');
jest.mock('../../application/validators/auth.validator');

describe('RegisterUserUseCase', () => {
    let registerUserUseCase: RegisterUserUseCase;
    let mockUserRepository: jest.Mocked<IUserRepository>;
    let mockAuthService: jest.Mocked<IAuthService>;
    let mockValidateCredentials: jest.SpyInstance;

    const mockUserId = 'test-user-id';
    const mockDate = new Date('2023-01-01T00:00:00.000Z');
    
    beforeEach(() => {
        // Mock current date
        jest.useFakeTimers();
        jest.setSystemTime(mockDate);
        
        // Mock UUID generation
        (uuidv4 as jest.Mock).mockReturnValue(mockUserId);
        
        // Mock validators
        mockValidateCredentials = jest.spyOn(validators, 'validateCredentials').mockImplementation(() => {});
        
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
        
        registerUserUseCase = new RegisterUserUseCase(mockUserRepository, mockAuthService);
    });
    
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });
    
    it('should validate email and password format with strong password requirement', async () => {
        // Arrange
        const dto: RegisterUserDTO = {
            email: 'test@example.com',
            password: 'StrongPass123!',
            firstName: 'John',
            lastName: 'Doe'
        };
        
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockAuthService.hashPassword.mockResolvedValue('hashed_password');
        mockAuthService.generateTokens.mockReturnValue({ 
            accessToken: 'access_token', 
            refreshToken: 'refresh_token' 
        });
        
        const mockUser = {
            id: mockUserId,
            withUpdatedRefreshToken: jest.fn().mockReturnThis()
        } as unknown as User;
        
        jest.spyOn(User, 'create').mockReturnValue(mockUser);
        
        // Act
        await registerUserUseCase.execute(dto);
        
        // Assert
        expect(mockValidateCredentials).toHaveBeenCalledWith(
            dto.email, 
            dto.password, 
            { requireStrongPassword: true }
        );
    });
    
    it('should throw validation error when invalid data is provided', async () => {
        // Arrange
        const dto: RegisterUserDTO = {
            email: 'invalid-email',
            password: 'weak',
            firstName: 'John',
            lastName: 'Doe'
        };
        
        // Mock validation to throw error
        mockValidateCredentials.mockImplementation(() => {
            throw new AppError('Invalid email format', 400);
        });
        
        // Act & Assert
        await expect(registerUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(registerUserUseCase.execute(dto)).rejects.toThrow('Invalid email format');
        expect(mockValidateCredentials).toHaveBeenCalled();
        
        // Verify repository methods were not called
        expect(mockUserRepository.save).not.toHaveBeenCalled();
        expect(mockAuthService.hashPassword).not.toHaveBeenCalled();
    });
    
    it('should throw an error if user with the same email already exists', async () => {
        // Arrange
        const dto: RegisterUserDTO = {
            email: 'existing@example.com',
            password: 'StrongPass123!',
            firstName: 'John',
            lastName: 'Doe'
        };
        
        const existingUser = {} as User; // Mock existing user
        mockUserRepository.findByEmail.mockResolvedValue(existingUser);
        
        // Act & Assert
        await expect(registerUserUseCase.execute(dto)).rejects.toThrow(AppError);
        await expect(registerUserUseCase.execute(dto)).rejects.toThrow('Email already exists');
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
    });
    
    it('should register a new user successfully', async () => {
        // Arrange
        const dto: RegisterUserDTO = {
            email: 'new@example.com',
            password: 'StrongPass123!',
            firstName: 'John',
            lastName: 'Doe'
        };
        
        const hashedPassword = 'hashed_password';
        const accessToken = 'access_token';
        const refreshToken = 'refresh_token';
        
        // Mock repository and service responses
        mockUserRepository.findByEmail.mockResolvedValue(null);
        mockAuthService.hashPassword.mockResolvedValue(hashedPassword);
        mockAuthService.generateTokens.mockReturnValue({ accessToken, refreshToken });
        
        // Create a spy for User.create static method
        const mockUser = {
            id: mockUserId,
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            isActive: true,
            createdAt: mockDate,
            updatedAt: mockDate,
            withUpdatedRefreshToken: jest.fn().mockReturnThis()
        } as unknown as User;
        
        jest.spyOn(User, 'create').mockReturnValue(mockUser);
        
        // Act
        const result = await registerUserUseCase.execute(dto);
        
        // Assert
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
        expect(mockAuthService.hashPassword).toHaveBeenCalledWith(dto.password);
        expect(User.create).toHaveBeenCalledWith(mockUserId, {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            isActive: true,
            createdAt: mockDate,
            updatedAt: mockDate
        });
        expect(mockAuthService.generateTokens).toHaveBeenCalledWith(mockUserId, dto.email);
        expect(mockUser.withUpdatedRefreshToken).toHaveBeenCalledWith(refreshToken);
        expect(mockUserRepository.save).toHaveBeenCalledTimes(2);
        
        // Verify result
        expect(result).toEqual({
            user: mockUser,
            tokens: { accessToken, refreshToken }
        });
    });
}); 