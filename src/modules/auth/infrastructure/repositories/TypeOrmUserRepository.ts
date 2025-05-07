import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../config/database';
import { UserEntity } from '../entities/UserEntity';
import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { User, UserProps } from '../../../../core/domain/entities/User';

export class TypeOrmUserRepository implements IUserRepository {
    private readonly repository: Repository<UserEntity>;
    
    constructor() {
        this.repository = AppDataSource.getRepository(UserEntity);
    }
    
    async save(user: User): Promise<void> {
        const userEntity = this.mapDomainToEntity(user);
        await this.repository.save(userEntity);
    }
    
    async findById(id: string): Promise<User | null> {
        const userEntity = await this.repository.findOne({ where: { id } });
        return userEntity ? this.mapEntityToDomain(userEntity) : null;
    }
    
    async findByEmail(email: string): Promise<User | null> {
        const userEntity = await this.repository.findOne({ where: { email } });
        return userEntity ? this.mapEntityToDomain(userEntity) : null;
    }
    
    async findByRefreshToken(refreshToken: string): Promise<User | null> {
        const userEntity = await this.repository.findOne({ where: { refreshToken } });
        return userEntity ? this.mapEntityToDomain(userEntity) : null;
    }
    
    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }
    
    private mapEntityToDomain(entity: UserEntity): User {
        const props: UserProps = {
            email: entity.email,
            password: entity.password,
            firstName: entity.firstName,
            lastName: entity.lastName,
            isActive: entity.isActive,
            refreshToken: entity.refreshToken,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };
        
        return User.create(entity.id, props);
    }
    
    private mapDomainToEntity(domain: User): UserEntity {
        const entity = new UserEntity();
        entity.id = domain.id;
        entity.email = domain.email;
        entity.password = domain.password;
        entity.firstName = domain.firstName;
        entity.lastName = domain.lastName;
        entity.isActive = domain.isActive;
        entity.refreshToken = domain.refreshToken;
        entity.createdAt = domain.createdAt;
        entity.updatedAt = domain.updatedAt;
        
        return entity;
    }
} 