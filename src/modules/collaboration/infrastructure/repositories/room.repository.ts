import { Room, RoomProps } from '../../domain/aggregates/room.aggregate';
import { IRoomRepository } from '../../application/interfaces/room.repository.interface';
import { RoomEntity } from '../entities/room.entity';
import { AppDataSource } from '../../../../config/database';
import { RoomRuleVO } from '../../domain/value-objects/room-rule.vo';
import { Repository } from 'typeorm';
import Logger from '../../../../shared/utils/logger';

export class RoomRepository implements IRoomRepository {
  private readonly repository: Repository<RoomEntity>;
  private readonly logger: Logger;

  constructor() {
    this.repository = AppDataSource.getRepository(RoomEntity);
    this.logger = new Logger(RoomRepository.name);
  }

  async findById(id: string): Promise<Room | null> {
    try {
      const roomEntity = await this.repository.findOne({
        where: { id }
      });

      if (!roomEntity) {
        return null;
      }

      return this.mapToDomain(roomEntity);
    } catch (error) {
      this.logger.error(`Error finding room by ID ${id}:`, error);
      throw error;
    }
  }

  async findByOwnerId(ownerId: string): Promise<Room[]> {
    try {
      const roomEntities = await this.repository.find({
        where: { ownerId }
      });

      return roomEntities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.logger.error(`Error finding rooms by owner ID ${ownerId}:`, error);
      throw error;
    }
  }

  async findActive(): Promise<Room[]> {
    try {
      const roomEntities = await this.repository.find({
        where: { isActive: true }
      });

      return roomEntities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.logger.error('Error finding active rooms:', error);
      throw error;
    }
  }

  async save(room: Room): Promise<void> {
    try {
      const roomEntity = this.mapToEntity(room);
      await this.repository.save(roomEntity);
    } catch (error) {
      this.logger.error(`Error saving room ${room['id']}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      this.logger.error(`Error deleting room ${id}:`, error);
      throw error;
    }
  }

  private mapToDomain(entity: RoomEntity): Room {
    // 將存儲的規則映射到值物件
    const roomRule = new RoomRuleVO(
      entity.rules.maxPlayers,
      entity.rules.allowRelay,
      entity.rules.latencyTargetMs,
      entity.rules.opusBitrate
    );

    // 將玩家陣列轉換為 Set
    const players = new Set<string>(entity.players);

    // 建立領域物件
    const props: RoomProps = {
      ownerId: entity.ownerId,
      rules: roomRule,
      players: players,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    // 使用私有建構子方法建立 Room 實例
    return Room.reconstruct(entity.id, props);
  }

  private mapToEntity(room: Room): RoomEntity {
    const entity = new RoomEntity();
    entity.id = room['id'];
    entity.ownerId = room.ownerId;
    entity.rules = {
      maxPlayers: room.rules.maxPlayers,
      allowRelay: room.rules.allowRelay,
      latencyTargetMs: room.rules.latencyTargetMs,
      opusBitrate: room.rules.opusBitrate
    };
    entity.players = Array.from(room.players);
    entity.isActive = room.isActive;
    entity.createdAt = room.createdAt;
    entity.updatedAt = room.updatedAt;
    return entity;
  }
} 