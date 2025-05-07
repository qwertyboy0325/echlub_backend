import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../../../shared/domain/AppError';

// Augment Request type definition to include user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

export const authenticateJwt = (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        throw new AppError('Authorization header is required', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        throw new AppError('Bearer token is required', 401);
    }
    
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'default_secret'
        ) as { userId: string; email: string };
        
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };
        
        next();
    } catch (error) {
        throw new AppError('Invalid token', 401);
    }
}; 