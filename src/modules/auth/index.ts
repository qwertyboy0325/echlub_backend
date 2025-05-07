import { Router } from 'express';
import { createAuthRoutes } from './presentation/routes/auth.routes';
import { AuthServiceImpl } from './domain/services/AuthServiceImpl';
import { TypeOrmUserRepository } from './infrastructure/repositories/TypeOrmUserRepository';
import { IAuthService } from './domain/interfaces/IAuthService';
import { IUserRepository } from '../../core/domain/interfaces/IUserRepository';

// Module exports
export { AuthServiceImpl } from './domain/services/AuthServiceImpl';
export { authenticateJwt } from './presentation/middlewares/authenticateJwt';
export * from './domain/interfaces/IAuthService';

export interface AuthModuleProps {
    router: Router;
    authService: IAuthService;
    userRepository: IUserRepository;
}

export const initAuthModule = (): AuthModuleProps => {
    // Dependencies
    const userRepository = new TypeOrmUserRepository();
    const authService = new AuthServiceImpl();
    
    // 使用工廠函數創建路由，傳入共享的依賴項
    const router = createAuthRoutes(userRepository, authService);
    
    return {
        router,
        authService,
        userRepository
    };
}; 