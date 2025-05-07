import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { IUserRepository } from '../../../../core/domain/interfaces/IUserRepository';
import { IAuthService } from '../../domain/interfaces/IAuthService';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/RefreshTokenUseCase';
import { LogoutUserUseCase } from '../../application/use-cases/LogoutUserUseCase';
import { authenticateJwt } from '../middlewares/authenticateJwt';
import { validateRegistrationMiddleware } from '../middlewares/validateRegistration';
import { validateLoginMiddleware } from '../middlewares/validateLogin';

export function createAuthRoutes(
  userRepository: IUserRepository,
  authService: IAuthService
): Router {
  const router = Router();
  
  // Initialize use cases
  const registerUserUseCase = new RegisterUserUseCase(userRepository, authService);
  const loginUserUseCase = new LoginUserUseCase(userRepository, authService);
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, authService);
  const logoutUserUseCase = new LogoutUserUseCase(userRepository);
  
  // Initialize controller
  const authController = new AuthController(
    registerUserUseCase,
    loginUserUseCase,
    refreshTokenUseCase,
    logoutUserUseCase
  );
  
  // Registration route with validation middleware
  router.post('/register', validateRegistrationMiddleware, (req, res, next) => 
    authController.register(req, res, next)
  );
  
  // Login route with validation middleware
  router.post('/login', validateLoginMiddleware, (req, res, next) => 
    authController.login(req, res, next)
  );
  
  // Refresh token route
  router.post('/refresh-token', (req, res, next) => 
    authController.refreshToken(req, res, next)
  );
  
  // Logout route (requires authentication)
  router.post('/logout', authenticateJwt, (req, res, next) => 
    authController.logout(req, res, next)
  );
  
  return router;
} 