import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { IAuthService, IAuthTokens } from '../../domain/interfaces/IAuthService';
import { AppError } from '../../../../shared/domain/AppError';

export interface RefreshTokenDTO {
    refreshToken: string;
}

export class RefreshTokenUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly authService: IAuthService
    ) {}
    
    async execute(dto: RefreshTokenDTO): Promise<IAuthTokens> {
        // 首先檢查是否有使用此刷新令牌的用戶
        const user = await this.userRepository.findByRefreshToken(dto.refreshToken);
        
        if (!user) {
            throw new AppError('Invalid refresh token', 401);
        }
        
        // 然後驗證令牌的有效性
        const decoded = await this.authService.verifyRefreshToken(dto.refreshToken);
        
        if (!decoded) {
            throw new AppError('Invalid refresh token', 401);
        }
        
        const tokens = this.authService.generateTokens(user.id, user.email);
        
        const userWithRefreshToken = user.withUpdatedRefreshToken(tokens.refreshToken);
        await this.userRepository.save(userWithRefreshToken);
        
        return tokens;
    }
} 