import { Request, Response, NextFunction } from 'express';
import { validateEmail } from '../../application/validators/auth.validator';
import { AppError } from '../../../../shared/domain/AppError';

/**
 * Express middleware to validate login input
 * Ensures email format is valid
 */
export function validateLoginMiddleware(
  req: Request, 
  _res: Response, 
  next: NextFunction
): void {
  try {
    const { email, password } = req.body;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    if (!password) {
      throw new AppError('Password is required', 400);
    }
    
    // Only validate email format (password format is not validated during login)
    validateEmail(email);
    
    // Validation passed, continue to next middleware/controller
    next();
  } catch (error) {
    next(error);
  }
} 