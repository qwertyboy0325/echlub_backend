import { AggregateRoot } from '../AggregateRoot';
 
export interface IRepository<T extends AggregateRoot<any>> {
    save(entity: T): Promise<void>;
    findById(id: string): Promise<T | null>;
    delete(id: string): Promise<void>;
} 