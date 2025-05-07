import { v4 as uuidv4 } from 'uuid';
import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { IAuthService, IAuthenticationResult } from '../../domain/interfaces/IAuthService';
import { User } from '../../../../core/domain/entities/User';
import { AppError } from '../../../../shared/domain/AppError';
import { validateCredentials } from '../validators/auth.validator';

export interface RegisterUserDTO {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

export class RegisterUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly authService: IAuthService
    ) {}
    
    async execute(dto: RegisterUserDTO): Promise<IAuthenticationResult> {
        // Validate email and password format
        validateCredentials(dto.email, dto.password, { requireStrongPassword: true });
        
        const existingUser = await this.userRepository.findByEmail(dto.email);
        
        if (existingUser) {
            throw new AppError('Email already exists', 400);
        }
        
        const hashedPassword = await this.authService.hashPassword(dto.password);
        
        const userId = uuidv4();
        const now = new Date();
        
        const user = User.create(userId, {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            isActive: true,
            createdAt: now,
            updatedAt: now
        });
        
        await this.userRepository.save(user);
        
        const tokens = this.authService.generateTokens(user.id, user.email);
        
        const userWithRefreshToken = user.withUpdatedRefreshToken(tokens.refreshToken);
        await this.userRepository.save(userWithRefreshToken);
        
        return {
            user: userWithRefreshToken,
            tokens
        };
    }
} 