import { Room } from '../../domain/aggregates/room.aggregate';
import { IRoomRepository } from '../interfaces/room.repository.interface';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

export interface JoinRoomDTO {
  roomId: string;
  peerId: string;
}

export class JoinRoomUseCase {
  private readonly logger: Logger;

  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(JoinRoomUseCase.name);
  }

  async execute(dto: JoinRoomDTO): Promise<void> {
    try {
      this.logger.info(`Peer ${dto.peerId} joining room ${dto.roomId}`);
      
      // 查找房間
      const room = await this.roomRepository.findById(dto.roomId);
      
      if (!room) {
        throw new Error(`Room ${dto.roomId} not found`);
      }
      
      if (!room.isActive) {
        throw new Error(`Room ${dto.roomId} is not active`);
      }
      
      // 加入房間
      room.join(dto.peerId);
      
      // 儲存變更
      await this.roomRepository.save(room);
      
      // 發布領域事件
      const events = (room as any).pullDomainEvents();
      await this.eventPublisher.publishAll(events);
      
      this.logger.info(`Peer ${dto.peerId} joined room ${dto.roomId}`);
    } catch (error) {
      this.logger.error(`Failed to join room ${dto.roomId}:`, error);
      throw error;
    }
  }
} 