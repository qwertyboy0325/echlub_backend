import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/domain/AppError';
import logger from '../../../utils/logger';

export const errorHandlerMiddleware = (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error(`${error.name}: ${error.message}`);
    
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            status: 'error',
            message: error.message
        });
        return;
    }
    
    if (error.name === 'SyntaxError') {
        res.status(400).json({
            status: 'error',
            message: 'Invalid JSON'
        });
        return;
    }
    
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
}; 