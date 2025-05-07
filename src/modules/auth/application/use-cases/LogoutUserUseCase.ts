import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';

export interface LogoutUserDTO {
    userId: string;
}

export class LogoutUserUseCase {
    constructor(
        private readonly userRepository: IUserRepository
    ) {}
    
    async execute(dto: LogoutUserDTO): Promise<void> {
        const user = await this.userRepository.findById(dto.userId);
        
        if (user) {
            const userWithoutRefreshToken = user.withUpdatedRefreshToken(undefined);
            await this.userRepository.save(userWithoutRefreshToken);
        }
    }
} 