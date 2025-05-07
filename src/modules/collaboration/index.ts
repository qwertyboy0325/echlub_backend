import { Server } from 'socket.io';
import { Router, Request, Response } from 'express';
import { CollaborationGateway } from './infrastructure/gateways/collaboration.gateway';
import { SignalService } from './infrastructure/services/signal.service';
import { ConnectionService } from './infrastructure/services/connection.service';
import { MessageQueueService } from './infrastructure/services/message-queue.service';
import { MonitoringService } from './infrastructure/services/monitoring.service';
import { RoomController } from './presentation/controllers/room.controller';
import { RoomRepository } from './infrastructure/repositories/room.repository';
import { PeerRepository } from './infrastructure/repositories/peer.repository';
import { DomainEventPublisher } from '../../shared/domain/DomainEventPublisher';

export const initCollaborationModule = (io: Server) => {
  const router = Router();

  // 初始化共享元件
  const eventPublisher = new DomainEventPublisher();
  const roomRepository = new RoomRepository();
  const peerRepository = new PeerRepository();
  const messageQueueService = new MessageQueueService();
  const monitoringService = new MonitoringService();

  // 初始化服務
  const signalService = new SignalService(
    peerRepository,
    eventPublisher,
    messageQueueService,
    monitoringService
  );
  const connectionService = new ConnectionService(
    peerRepository,
    eventPublisher
  );

  // 初始化 WebSocket Gateway
  const collaborationGateway = new CollaborationGateway(
    io,
    roomRepository,
    peerRepository,
    signalService,
    connectionService,
    eventPublisher
  );

  // 初始化控制器
  const roomController = new RoomController(roomRepository, eventPublisher);

  // 註冊路由
  router.post('/rooms', (req: Request, res: Response) => roomController.createRoom(req, res));
  router.patch('/rooms/:id/rules', (req: Request, res: Response) => roomController.updateRoomRules(req, res));
  router.delete('/rooms/:id', (req: Request, res: Response) => roomController.closeRoom(req, res));
  router.get('/rooms/:id', (req: Request, res: Response) => roomController.getRoomStatus(req, res));

  return {
    router,
    gateway: collaborationGateway
  };
}; 