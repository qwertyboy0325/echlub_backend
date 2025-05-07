import { AppDataSource } from '../config/database';

async function migrate() {
    try {
        await AppDataSource.initialize();
        console.log('Database connection established');

        await AppDataSource.runMigrations();
        console.log('Migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

migrate(); 