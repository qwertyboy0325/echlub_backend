import { IRepository } from '../../../shared/domain/interfaces/IRepository';
import { User } from '../entities/User';
 
export interface IUserRepository extends IRepository<User> {
    findByEmail(email: string): Promise<User | null>;
    findByRefreshToken(refreshToken: string): Promise<User | null>;
} 