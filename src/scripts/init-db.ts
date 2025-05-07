import { createConnection } from 'typeorm';
import { AppDataSource } from '../config/database';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const forcePostgres = process.env.USE_POSTGRES === 'true';
const usePostgres = forcePostgres || isProduction;

async function createDatabase() {
    if (!usePostgres) {
        // 開發環境使用SQLite，確保目錄存在
        const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
        const dbDir = path.dirname(dbPath);
        
        // 確保目錄存在
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        logger.info(`SQLite database will be created at: ${dbPath}`);
        return;
    }
    
    // 使用PostgreSQL
    logger.info('Using PostgreSQL database');
    const connection = await createConnection({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'postgres' // 連接到預設資料庫
    });

    try {
        // 檢查資料庫是否存在
        const result = await connection.query(
            `SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME || 'echlub_auth'}'`
        );

        if (result.length === 0) {
            // 創建資料庫
            await connection.query(`CREATE DATABASE ${process.env.DB_NAME || 'echlub_auth'}`);
            logger.info('Database created successfully');
        } else {
            logger.info('Database already exists');
        }
    } catch (error) {
        logger.error('Error creating database:', error);
        throw error;
    } finally {
        await connection.close();
    }
}

async function initializeDatabase() {
    try {
        // 創建資料庫
        await createDatabase();

        // 初始化 TypeORM 連接
        await AppDataSource.initialize();
        logger.info('Database connection established');

        // 運行遷移
        await AppDataSource.runMigrations();
        logger.info('Migrations completed successfully');
    } catch (error) {
        logger.error('Database initialization failed:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

// 如果是直接執行此腳本
if (require.main === module) {
    initializeDatabase();
}

export { initializeDatabase }; 