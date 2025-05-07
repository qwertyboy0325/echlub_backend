import { v4 as uuidv4 } from 'uuid';
import { Room } from '../../domain/aggregates/room.aggregate';
import { RoomRuleVO } from '../../domain/value-objects/room-rule.vo';
import { IRoomRepository } from '../interfaces/room.repository.interface';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

export interface CreateRoomDTO {
  ownerId: string;
  maxPlayers: number;
  allowRelay: boolean;
  latencyTargetMs: number;
  opusBitrate: number;
}

export class CreateRoomUseCase {
  private readonly logger: Logger;

  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(CreateRoomUseCase.name);
  }

  async execute(dto: CreateRoomDTO): Promise<string> {
    try {
      this.logger.info(`Creating room for owner ${dto.ownerId}`);
      
      // 生成唯一ID
      const roomId = uuidv4();
      
      // 建立房間規則值物件
      const roomRule = new RoomRuleVO(
        dto.maxPlayers,
        dto.allowRelay,
        dto.latencyTargetMs,
        dto.opusBitrate
      );
      
      // 建立房間聚合根
      const room = Room.create(roomId, {
        ownerId: dto.ownerId,
        rules: roomRule,
        players: new Set([dto.ownerId]), // 建立者自動加入房間
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 儲存房間
      await this.roomRepository.save(room);
      
      // 發布領域事件
      const events = (room as any).pullDomainEvents();
      await this.eventPublisher.publishAll(events);
      
      this.logger.info(`Room created with ID: ${roomId}`);
      
      return roomId;
    } catch (error) {
      this.logger.error('Failed to create room:', error);
      throw error;
    }
  }
} 