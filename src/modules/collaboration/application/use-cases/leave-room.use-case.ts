import { IRoomRepository } from '../interfaces/room.repository.interface';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

export interface LeaveRoomDTO {
  roomId: string;
  peerId: string;
}

export class LeaveRoomUseCase {
  private readonly logger: Logger;

  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(LeaveRoomUseCase.name);
  }

  async execute(dto: LeaveRoomDTO): Promise<void> {
    try {
      this.logger.info(`Peer ${dto.peerId} leaving room ${dto.roomId}`);
      
      // 查找房間
      const room = await this.roomRepository.findById(dto.roomId);
      
      if (!room) {
        throw new Error(`Room ${dto.roomId} not found`);
      }
      
      // 離開房間
      room.leave(dto.peerId);
      
      // 如果房間還存在（可能已經自動關閉）
      if (room.isActive) {
        // 儲存變更
        await this.roomRepository.save(room);
      } else {
        // 如果房間已關閉，則刪除
        this.logger.info(`Room ${dto.roomId} closed, deleting from repository`);
        await this.roomRepository.delete(dto.roomId);
      }
      
      // 發布領域事件
      const events = (room as any).pullDomainEvents();
      await this.eventPublisher.publishAll(events);
      
      this.logger.info(`Peer ${dto.peerId} left room ${dto.roomId}`);
    } catch (error) {
      this.logger.error(`Failed to leave room ${dto.roomId}:`, error);
      throw error;
    }
  }
} 