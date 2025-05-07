import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { IAuthService, IAuthenticationResult } from '../../domain/interfaces/IAuthService';
import { AppError } from '../../../../shared/domain/AppError';
import { validateEmail } from '../validators/auth.validator';

export interface LoginUserDTO {
    email: string;
    password: string;
}

export class LoginUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly authService: IAuthService
    ) {}
    
    async execute(dto: LoginUserDTO): Promise<IAuthenticationResult> {
        // Validate email format only - we don't validate password format for login
        // since we're checking against the stored hash
        validateEmail(dto.email);
        
        if (!dto.password) {
            throw new AppError('Password is required', 400);
        }
        
        const user = await this.userRepository.findByEmail(dto.email);
        
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }
        
        const isPasswordValid = await this.authService.comparePasswords(dto.password, user.password);
        
        if (!isPasswordValid) {
            throw new AppError('Invalid credentials', 401);
        }
        
        if (!user.isActive) {
            throw new AppError('Account is not active', 403);
        }
        
        const tokens = this.authService.generateTokens(user.id, user.email);
        
        const userWithRefreshToken = user.withUpdatedRefreshToken(tokens.refreshToken);
        await this.userRepository.save(userWithRefreshToken);
        
        return {
            user: userWithRefreshToken,
            tokens
        };
    }
} 