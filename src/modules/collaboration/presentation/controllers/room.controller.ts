import { Request, Response } from 'express';
import { CreateRoomUseCase, CreateRoomDTO } from '../../application/use-cases/create-room.use-case';
import { JoinRoomUseCase } from '../../application/use-cases/join-room.use-case';
import { LeaveRoomUseCase } from '../../application/use-cases/leave-room.use-case';
import { UpdateRoomRulesUseCase, UpdateRoomRulesDTO } from '../../application/use-cases/update-room-rules.use-case';
import { CloseRoomUseCase, CloseRoomDTO } from '../../application/use-cases/close-room.use-case';
import { IRoomRepository } from '../../application/interfaces/room.repository.interface';
import { RoomRepository } from '../../infrastructure/repositories/room.repository';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

export class RoomController {
  private readonly logger: Logger;
  private readonly createRoomUseCase: CreateRoomUseCase;
  private readonly updateRoomRulesUseCase: UpdateRoomRulesUseCase;
  private readonly closeRoomUseCase: CloseRoomUseCase;
  
  // 這些用例暫未使用，但為將來實現保留
  // @ts-ignore: 暫未使用但需要初始化
  private readonly joinRoomUseCase: JoinRoomUseCase;
  // @ts-ignore: 暫未使用但需要初始化
  private readonly leaveRoomUseCase: LeaveRoomUseCase;

  constructor(
    roomRepository: IRoomRepository,
    eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(RoomController.name);
    this.createRoomUseCase = new CreateRoomUseCase(roomRepository, eventPublisher);
    this.joinRoomUseCase = new JoinRoomUseCase(roomRepository, eventPublisher);
    this.leaveRoomUseCase = new LeaveRoomUseCase(roomRepository, eventPublisher);
    this.updateRoomRulesUseCase = new UpdateRoomRulesUseCase(roomRepository, eventPublisher);
    this.closeRoomUseCase = new CloseRoomUseCase(roomRepository, eventPublisher);
  }

  // 建立房間
  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateRoomDTO = {
        ownerId: req.body.ownerId,
        maxPlayers: req.body.maxPlayers,
        allowRelay: req.body.allowRelay,
        latencyTargetMs: req.body.latencyTargetMs,
        opusBitrate: req.body.opusBitrate
      };
      
      const roomId = await this.createRoomUseCase.execute(dto);
      
      res.status(201).json({
        message: 'Room created successfully',
        roomId
      });
    } catch (error) {
      this.logger.error('Error creating room:', error);
      
      res.status(500).json({
        message: 'Failed to create room',
        error: error.message
      });
    }
  }

  // 更新房間規則
  async updateRoomRules(req: Request, res: Response): Promise<void> {
    try {
      const dto: UpdateRoomRulesDTO = {
        roomId: req.params.id,
        ownerId: req.body.ownerId,
        maxPlayers: req.body.maxPlayers,
        allowRelay: req.body.allowRelay,
        latencyTargetMs: req.body.latencyTargetMs,
        opusBitrate: req.body.opusBitrate
      };
      
      await this.updateRoomRulesUseCase.execute(dto);
      
      res.status(200).json({
        message: 'Room rules updated successfully'
      });
    } catch (error) {
      this.logger.error(`Error updating room rules for ${req.params.id}:`, error);
      
      res.status(error.message.includes('not found') ? 404 : 500).json({
        message: 'Failed to update room rules',
        error: error.message
      });
    }
  }

  // 關閉房間
  async closeRoom(req: Request, res: Response): Promise<void> {
    try {
      const dto: CloseRoomDTO = {
        roomId: req.params.id,
        ownerId: req.body.ownerId,
      };
      
      await this.closeRoomUseCase.execute(dto);
      
      res.status(200).json({
        message: 'Room closed successfully'
      });
    } catch (error) {
      this.logger.error(`Error closing room ${req.params.id}:`, error);
      
      res.status(error.message.includes('not found') ? 404 : 500).json({
        message: 'Failed to close room',
        error: error.message
      });
    }
  }

  // 獲取房間狀態
  async getRoomStatus(req: Request, res: Response): Promise<void> {
    try {
      const roomRepository = new RoomRepository();
      const room = await roomRepository.findById(req.params.id);
      
      if (!room) {
        res.status(404).json({
          message: `Room ${req.params.id} not found`
        });
        return;
      }
      
      res.status(200).json({
        room: room.toJSON()
      });
    } catch (error) {
      this.logger.error(`Error getting room status for ${req.params.id}:`, error);
      
      res.status(500).json({
        message: 'Failed to get room status',
        error: error.message
      });
    }
  }
} 