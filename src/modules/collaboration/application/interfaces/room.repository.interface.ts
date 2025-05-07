import { Room } from '../../domain/aggregates/room.aggregate';

export interface IRoomRepository {
  findById(id: string): Promise<Room | null>;
  findByOwnerId(ownerId: string): Promise<Room[]>;
  findActive(): Promise<Room[]>;
  save(room: Room): Promise<void>;
  delete(id: string): Promise<void>;
} 