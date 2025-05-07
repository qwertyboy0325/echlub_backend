import { RoomRuleVO } from '../../domain/value-objects/room-rule.vo';
import { IRoomRepository } from '../interfaces/room.repository.interface';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

export interface UpdateRoomRulesDTO {
  roomId: string;
  ownerId: string;  // 只有房主能更新規則
  maxPlayers: number;
  allowRelay: boolean;
  latencyTargetMs: number;
  opusBitrate: number;
}

export class UpdateRoomRulesUseCase {
  private readonly logger: Logger;

  constructor(
    private readonly roomRepository: IRoomRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(UpdateRoomRulesUseCase.name);
  }

  async execute(dto: UpdateRoomRulesDTO): Promise<void> {
    try {
      this.logger.info(`Updating rules for room ${dto.roomId}`);
      
      // 查找房間
      const room = await this.roomRepository.findById(dto.roomId);
      
      if (!room) {
        throw new Error(`Room ${dto.roomId} not found`);
      }
      
      if (!room.isActive) {
        throw new Error(`Room ${dto.roomId} is not active`);
      }
      
      // 驗證是否為房主
      if (!room.isOwner(dto.ownerId)) {
        throw new Error('Only the room owner can update room rules');
      }
      
      // 建立新的房間規則值物件
      const roomRule = new RoomRuleVO(
        dto.maxPlayers,
        dto.allowRelay,
        dto.latencyTargetMs,
        dto.opusBitrate
      );
      
      // 更新房間規則
      room.updateRules(roomRule);
      
      // 儲存變更
      await this.roomRepository.save(room);
      
      // 發布領域事件
      const events = (room as any).pullDomainEvents();
      await this.eventPublisher.publishAll(events);
      
      this.logger.info(`Rules updated for room ${dto.roomId}`);
    } catch (error) {
      this.logger.error(`Failed to update room rules for ${dto.roomId}:`, error);
      throw error;
    }
  }
} 