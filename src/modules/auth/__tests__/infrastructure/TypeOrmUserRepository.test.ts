import { TypeOrmUserRepository } from '../../infrastructure/repositories/TypeOrmUserRepository';
import { UserEntity } from '../../infrastructure/entities/UserEntity';
import { User } from '../../../../core/domain/entities/User';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../config/database';

// Mock TypeORM
jest.mock('../../../../config/database', () => ({
    AppDataSource: {
        getRepository: jest.fn()
    }
}));

describe('TypeOrmUserRepository', () => {
    let repository: TypeOrmUserRepository;
    let mockTypeOrmRepository: jest.Mocked<Repository<UserEntity>>;
    
    beforeEach(() => {
        // Create mock TypeORM repository
        mockTypeOrmRepository = {
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn()
        } as unknown as jest.Mocked<Repository<UserEntity>>;
        
        // Mock AppDataSource.getRepository to return our mock repository
        (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTypeOrmRepository);
        
        // Create the repository instance
        repository = new TypeOrmUserRepository();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('save', () => {
        it('should save user entity to database', async () => {
            // Arrange
            const mockUser = createMockUser();
            const expectedUserEntity = createMockUserEntity();
            
            // Act
            await repository.save(mockUser);
            
            // Assert
            expect(mockTypeOrmRepository.save).toHaveBeenCalledTimes(1);
            expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                id: expectedUserEntity.id,
                email: expectedUserEntity.email,
                password: expectedUserEntity.password,
                firstName: expectedUserEntity.firstName,
                lastName: expectedUserEntity.lastName,
                isActive: expectedUserEntity.isActive,
                refreshToken: expectedUserEntity.refreshToken
            }));
        });
    });
    
    describe('findById', () => {
        it('should return null when user not found', async () => {
            // Arrange
            const userId = 'non-existent-id';
            mockTypeOrmRepository.findOne.mockResolvedValue(null);
            
            // Act
            const result = await repository.findById(userId);
            
            // Assert
            expect(result).toBeNull();
            expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
        });
        
        it('should return domain user when found in database', async () => {
            // Arrange
            const userId = 'existing-user-id';
            const userEntity = createMockUserEntity();
            mockTypeOrmRepository.findOne.mockResolvedValue(userEntity);
            
            // Mock User.create to verify it's called with correct props
            const userCreateSpy = jest.spyOn(User, 'create');
            
            // Act
            const result = await repository.findById(userId);
            
            // Assert
            expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
            expect(userCreateSpy).toHaveBeenCalledWith(userEntity.id, expect.objectContaining({
                email: userEntity.email,
                password: userEntity.password,
                firstName: userEntity.firstName,
                lastName: userEntity.lastName,
                isActive: userEntity.isActive,
                refreshToken: userEntity.refreshToken
            }));
            expect(result).not.toBeNull();
            
            userCreateSpy.mockRestore();
        });
    });
    
    describe('findByEmail', () => {
        it('should query database with correct email', async () => {
            // Arrange
            const email = 'test@example.com';
            mockTypeOrmRepository.findOne.mockResolvedValue(null);
            
            // Act
            await repository.findByEmail(email);
            
            // Assert
            expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { email } });
        });
    });
    
    describe('findByRefreshToken', () => {
        it('should query database with correct refresh token', async () => {
            // Arrange
            const refreshToken = 'valid-refresh-token';
            mockTypeOrmRepository.findOne.mockResolvedValue(null);
            
            // Act
            await repository.findByRefreshToken(refreshToken);
            
            // Assert
            expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { refreshToken } });
        });
    });
    
    describe('delete', () => {
        it('should delete user from database', async () => {
            // Arrange
            const userId = 'user-to-delete';
            
            // Act
            await repository.delete(userId);
            
            // Assert
            expect(mockTypeOrmRepository.delete).toHaveBeenCalledWith(userId);
        });
    });
    
    // Helper functions to create mock objects
    function createMockUser(): User {
        return {
            id: 'user-id',
            email: 'user@example.com',
            password: 'hashed_password',
            firstName: 'John',
            lastName: 'Doe',
            isActive: true,
            refreshToken: 'refresh-token',
            createdAt: new Date(),
            updatedAt: new Date()
        } as User;
    }
    
    function createMockUserEntity(): UserEntity {
        const entity = new UserEntity();
        entity.id = 'user-id';
        entity.email = 'user@example.com';
        entity.password = 'hashed_password';
        entity.firstName = 'John';
        entity.lastName = 'Doe';
        entity.isActive = true;
        entity.refreshToken = 'refresh-token';
        entity.createdAt = new Date();
        entity.updatedAt = new Date();
        return entity;
    }
}); 