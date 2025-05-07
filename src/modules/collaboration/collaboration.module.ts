import { Server } from 'socket.io';
import { Request, Response, Application } from 'express';
import { Server as HttpServer } from 'http';
import { RoomController } from './presentation/controllers/room.controller';
import { CollaborationGateway } from './infrastructure/gateways/collaboration.gateway';
import { SignalService } from './infrastructure/services/signal.service';
import { ConnectionService } from './infrastructure/services/connection.service';
import { MonitoringService } from './infrastructure/services/monitoring.service';
import { RoomRepository } from './infrastructure/repositories/room.repository';
import { PeerRepository } from './infrastructure/repositories/peer.repository';
import { DomainEventPublisher } from '../../shared/domain/DomainEventPublisher';
import Logger from '../../shared/utils/logger';
import { MessageQueueService } from './infrastructure/services/message-queue.service';

export class CollaborationModule {
  private readonly logger: Logger;
  private readonly eventPublisher: DomainEventPublisher;
  private readonly roomRepository: RoomRepository;
  private readonly peerRepository: PeerRepository;
  private readonly messageQueueService: MessageQueueService;
  private readonly signalService: SignalService;
  private readonly connectionService: ConnectionService;
  private readonly monitoringService: MonitoringService;
  private readonly roomController: RoomController;
  private collaborationGateway: CollaborationGateway;

  constructor() {
    this.logger = new Logger(CollaborationModule.name);
    this.eventPublisher = new DomainEventPublisher();
    this.roomRepository = new RoomRepository();
    this.peerRepository = new PeerRepository();
    this.messageQueueService = new MessageQueueService();
    this.monitoringService = new MonitoringService();
    
    // 先創建 SignalService 
    this.signalService = new SignalService(
      this.peerRepository, 
      this.eventPublisher,
      this.messageQueueService,
      this.monitoringService
    );
    
    // 向 MessageQueueService 注入 SignalService 以避免循環依賴
    this.messageQueueService.setSignalService(this.signalService);
    
    this.connectionService = new ConnectionService(this.peerRepository, this.eventPublisher);
    this.roomController = new RoomController(this.roomRepository, this.eventPublisher);
  }

  initializeWebSocketServer(server: HttpServer): void {
    try {
      this.logger.info('Initializing WebSocket server for Collaboration Module');

      const io = new Server(server, {
        path: '/collaboration',
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });

      this.collaborationGateway = new CollaborationGateway(
        io,
        this.roomRepository,
        this.peerRepository,
        this.signalService,
        this.connectionService,
        this.eventPublisher
      );

      this.logger.info('WebSocket server initialized');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  setupRoutes(app: Application): void {
    try {
      this.logger.info('Setting up routes for Collaboration Module');

      // 建立房間
      app.post('/api/collaboration/rooms', (req: Request, res: Response) => this.roomController.createRoom(req, res));
      
      // 更新房間規則
      app.patch('/api/collaboration/rooms/:id/rules', (req: Request, res: Response) => this.roomController.updateRoomRules(req, res));
      
      // 關閉房間
      app.delete('/api/collaboration/rooms/:id', (req: Request, res: Response) => this.roomController.closeRoom(req, res));
      
      // 獲取房間狀態
      app.get('/api/collaboration/rooms/:id', (req: Request, res: Response) => this.roomController.getRoomStatus(req, res));

      this.logger.info('Routes set up successfully');
    } catch (error) {
      this.logger.error('Failed to set up routes:', error);
      throw error;
    }
  }

  startMonitoring(): void {
    try {
      this.logger.info('Starting monitoring service');
      
      // 每分鐘收集一次指標
      setInterval(() => {
        this.monitoringService.collectMetrics();
      }, 60000);
      
      this.logger.info('Monitoring service started');
    } catch (error) {
      this.logger.error('Failed to start monitoring service:', error);
      throw error;
    }
  }

  // 初始化整個模組
  initialize(app: Application, server: HttpServer): void {
    try {
      this.logger.info('Initializing Collaboration Module');
      
      // 初始化 WebSocket 伺服器
      this.initializeWebSocketServer(server);
      
      // 設置 HTTP 路由
      this.setupRoutes(app);
      
      // 啟動監控服務
      this.startMonitoring();
      
      this.logger.info('Collaboration Module initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Collaboration Module:', error);
      throw error;
    }
  }
} 