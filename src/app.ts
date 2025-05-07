import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
// import csrf from 'csurf';  // 暫時禁用CSRF保護，因為我們使用JWT進行API認證
import { AppDataSource } from './config/database';
import logger from './utils/logger';
import dotenv from 'dotenv';
import { initAuthModule } from './modules/auth';
import { errorHandlerMiddleware } from './shared/infrastructure/middlewares/errorHandlerMiddleware';
import { createServer } from 'http';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { setupSwagger } from './swagger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use(limiter);

// CSRF protection - 暫時禁用，因為我們使用JWT進行API認證
// app.use(csrf({ cookie: true }));

// 設置 Swagger API 文檔
setupSwagger(app);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns status of the server to confirm it's running
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Server is up and running
 */
// 健康檢查端點
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is up and running' });
});

// Database connection
AppDataSource.initialize()
    .then(() => {
        logger.info('Database connection established');
        
        // 初始化模組
        initializeModules();
    })
    .catch((error) => {
        logger.error('Database connection failed', error);
        process.exit(1);
    });

// 初始化所有模組
function initializeModules() {
    try {
        // 初始化 Auth Module
        const authModule = initAuthModule();
        app.use('/api/auth', authModule.router);
        
        // 初始化 Collaboration Module
        const collaborationModule = new CollaborationModule();
        collaborationModule.initialize(app, httpServer);
        
        // 不需要再次設置路由，因為已經在 initialize 方法中設置了
        
        logger.info('All modules initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize modules:', error);
        process.exit(1);
    }
}

// Error handling
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 3000;

// 啟動 HTTP 伺服器 (同時也是 WebSocket 伺服器)
httpServer.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Swagger API documentation available at http://localhost:${PORT}/api-docs`);
}); 