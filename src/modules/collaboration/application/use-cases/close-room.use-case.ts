import { IRoomRepository } from '../interfaces/room.repository.interface';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

export interface CloseRoomDTO {
  roomId: string;
  ownerId: string;  // 只有房主能關閉房間
}

export class CloseRoomUseCase {
  private readonly logger: Logger;

  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(CloseRoomUseCase.name);
  }

  async execute(dto: CloseRoomDTO): Promise<void> {
    try {
      this.logger.info(`Closing room ${dto.roomId}`);
      
      // 查找房間
      const room = await this.roomRepository.findById(dto.roomId);
      
      if (!room) {
        throw new Error(`Room ${dto.roomId} not found`);
      }
      
      if (!room.isActive) {
        throw new Error(`Room ${dto.roomId} is already closed`);
      }
      
      // 驗證是否為房主
      if (!room.isOwner(dto.ownerId)) {
        throw new Error('Only the room owner can close the room');
      }
      
      // 關閉房間
      room.close();
      
      // 儲存變更
      await this.roomRepository.delete(dto.roomId);
      
      // 發布領域事件
      const events = (room as any).pullDomainEvents();
      await this.eventPublisher.publishAll(events);
      
      this.logger.info(`Room ${dto.roomId} closed`);
    } catch (error) {
      this.logger.error(`Failed to close room ${dto.roomId}:`, error);
      throw error;
    }
  }
} 