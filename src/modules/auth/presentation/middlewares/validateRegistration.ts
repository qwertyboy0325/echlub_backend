import { Request, Response, NextFunction } from 'express';
import { validateCredentials } from '../../application/validators/auth.validator';
import { AppError } from '../../../../shared/domain/AppError';

/**
 * Express middleware to validate registration input
 * Ensures email format is valid and password meets strength requirements
 */
export function validateRegistrationMiddleware(
  req: Request, 
  _res: Response, 
  next: NextFunction
): void {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    
    // Validate email format and password strength (requires strong password)
    validateCredentials(email, password, { requireStrongPassword: true });
    
    // Validation passed, continue to next middleware/controller
    next();
  } catch (error) {
    next(error);
  }
} 