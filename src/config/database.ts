import { DataSource } from 'typeorm';
import { UserEntity } from '../modules/auth/infrastructure/entities/UserEntity';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// 使用的數據庫類型取決於環境和設置
// 如果USE_POSTGRES=true，則強制使用PostgreSQL
// 否則：開發環境使用SQLite，生產環境使用PostgreSQL
const isProduction = process.env.NODE_ENV === 'production';
const forcePostgres = process.env.USE_POSTGRES === 'true';
const usePostgres = forcePostgres || isProduction;

export const AppDataSource = new DataSource({
    type: usePostgres ? 'postgres' : 'better-sqlite3',
    host: usePostgres ? (process.env.DB_HOST || 'localhost') : undefined,
    port: usePostgres ? parseInt(process.env.DB_PORT || '5432') : undefined,
    username: usePostgres ? (process.env.DB_USERNAME || 'postgres') : undefined,
    password: usePostgres ? (process.env.DB_PASSWORD || 'postgres') : undefined,
    database: usePostgres 
        ? (process.env.DB_NAME || 'echlub_auth')
        : path.join(__dirname, '..', '..', 'database.sqlite'),
    synchronize: !isProduction,
    logging: !isProduction,
    entities: [UserEntity],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts']
}); 