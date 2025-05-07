import { Server, Socket } from 'socket.io';
import Logger from '../../../../shared/utils/logger';
import { SignalService } from '../services/signal.service';
import { ConnectionService } from '../services/connection.service';
import { RoomRepository } from '../repositories/room.repository';
import { PeerRepository } from '../repositories/peer.repository';
import { JoinRoomUseCase } from '../../application/use-cases/join-room.use-case';
import { LeaveRoomUseCase } from '../../application/use-cases/leave-room.use-case';
import { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import { MessageQueueService } from '../services/message-queue.service';
import { MonitoringService } from '../services/monitoring.service';

interface RoomConnectionStats {
  roomId: string;
  playerCount: number;
  connectionCount: number;
  lastUpdated: number;
}

export class CollaborationGateway {
  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly roomRepository: RoomRepository;
  private readonly peerRepository: PeerRepository;
  private readonly signalService: SignalService;
  private readonly connectionService: ConnectionService;
  private readonly eventPublisher: DomainEventPublisher;
  private readonly clients: Map<string, Set<Socket>> = new Map();
  private readonly roomStats: Map<string, RoomConnectionStats> = new Map();
  private readonly MAX_CONNECTIONS_PER_ROOM = 20; // 理論上 4 人房間有 6 條連接，設置較高的閾值以應對潛在的重連

  constructor(
    private readonly io: Server,
    roomRepository?: RoomRepository,
    peerRepository?: PeerRepository,
    signalService?: SignalService,
    connectionService?: ConnectionService,
    eventPublisher?: DomainEventPublisher
  ) {
    this.roomRepository = roomRepository || new RoomRepository();
    this.peerRepository = peerRepository || new PeerRepository();
    this.eventPublisher = eventPublisher || new DomainEventPublisher();
    this.signalService = signalService || new SignalService(
      this.peerRepository, 
      this.eventPublisher, 
      new MessageQueueService(), 
      new MonitoringService()
    );
    this.connectionService = connectionService || new ConnectionService(this.peerRepository, this.eventPublisher);

    this.setupSocketHandlers();
    
    // 監控房間連接統計
    setInterval(() => this.monitorRooms(), 30000);
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);

      socket.on('join', (data) => this.handleJoin(socket, data));
      socket.on('leave', (data) => this.handleLeave(socket, data));
      socket.on('ice-candidate', (data) => this.handleIceCandidate(socket, data));
      socket.on('offer', (data) => this.handleOffer(socket, data));
      socket.on('answer', (data) => this.handleAnswer(socket, data));
      socket.on('reconnect-request', (data) => this.handleReconnectRequest(socket, data));
      socket.on('connection-state', (data) => this.handleConnectionState(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  private async handleConnection(socket: Socket): Promise<void> {
    const { roomId, peerId } = socket.handshake.query;
    
    if (!roomId || !peerId) {
      this.logger.warn('Invalid connection parameters');
      socket.disconnect();
      return;
    }

    this.logger.info(`Socket connected: ${socket.id}, peerId: ${peerId}, roomId: ${roomId}`);

    // 存儲客戶端連接
    if (!this.clients.has(peerId as string)) {
      this.clients.set(peerId as string, new Set());
    }
    const clientSet = this.clients.get(peerId as string);
    if (clientSet) {
      clientSet.add(socket);
    }

    // 設置房間和對等連接
    socket.data.roomId = roomId;
    socket.data.peerId = peerId;

    // 加入 Socket.IO 房間
    socket.join(roomId as string);
  }

  private async handleJoin(socket: Socket, data: { roomId: string; peerId: string }): Promise<void> {
    try {
      this.logger.info(`Peer ${data.peerId} joining room ${data.roomId}`);

      // 檢查連接數量是否超過限制
      this.updateRoomStats(data.roomId);
      const stats = this.roomStats.get(data.roomId);
      if (stats && stats.connectionCount >= this.MAX_CONNECTIONS_PER_ROOM) {
        this.logger.warn(`Room ${data.roomId} has reached maximum connections: ${stats.connectionCount}`);
        socket.emit('error', {
          code: 'ERR_MAX_CONNECTIONS',
          message: 'Room has reached maximum connection limit'
        });
        return;
      }

      // 使用加入房間用例
      const joinRoomUseCase = new JoinRoomUseCase(this.roomRepository, this.eventPublisher);
      await joinRoomUseCase.execute({
        roomId: data.roomId,
        peerId: data.peerId
      });

      // 獲取房間中的其他玩家
      const room = await this.roomRepository.findById(data.roomId);
      
      if (!room) {
        throw new Error(`Room ${data.roomId} not found`);
      }

      // 通知房間中的其他玩家有新玩家加入
      this.io.to(data.roomId).emit('player-joined', {
        peerId: data.peerId,
        roomId: data.roomId,
        totalPlayers: room.players.size,
        isRoomOwner: room.ownerId === data.peerId
      });

      // 向新加入的玩家發送當前房間狀態和其他玩家列表
      socket.emit('room-state', {
        roomId: data.roomId,
        ownerId: room.ownerId,
        players: Array.from(room.players),
        rules: room.rules.toJSON()
      });

      // 更新房間統計
      this.updateRoomStats(data.roomId, room.players.size);
    } catch (error) {
      this.logger.error(`Error handling join for peer ${data.peerId}:`, error);
      socket.emit('error', {
        message: error.message
      });
    }
  }

  private async handleLeave(socket: Socket, data: { roomId: string; peerId: string }): Promise<void> {
    try {
      this.logger.info(`Peer ${data.peerId} leaving room ${data.roomId}`);

      // 使用離開房間用例
      const leaveRoomUseCase = new LeaveRoomUseCase(this.roomRepository, this.eventPublisher);
      await leaveRoomUseCase.execute({
        roomId: data.roomId,
        peerId: data.peerId
      });

      // 通知房間中的其他玩家有玩家離開
      this.io.to(data.roomId).emit('player-left', {
        peerId: data.peerId,
        roomId: data.roomId
      });

      // 更新房間統計
      this.updateRoomStats(data.roomId);

      // 離開 Socket.IO 房間
      socket.leave(data.roomId);
    } catch (error) {
      this.logger.error(`Error handling leave for peer ${data.peerId}:`, error);
      socket.emit('error', {
        message: error.message
      });
    }
  }

  private async handleIceCandidate(socket: Socket, data: { roomId: string; from: string; to: string; candidate: any }): Promise<void> {
    try {
      // 這裡新增了限流以處理大量 ICE 候選
      this.logger.debug(`ICE candidate from ${data.from} to ${data.to}`);

      // 使用信令服務處理 ICE 候選
      await this.signalService.handleIceCandidate({
        roomId: data.roomId,
        from: data.from,
        to: data.to,
        candidate: data.candidate
      });

      // 轉發 ICE 候選到目標對等端
      this.forwardToClient(data.to, 'ice-candidate', {
        from: data.from,
        candidate: data.candidate
      });
      
      // 更新房間連接統計
      this.updateRoomStats(data.roomId);
    } catch (error) {
      this.logger.error(`Error handling ICE candidate:`, error);
      socket.emit('error', {
        message: error.message
      });
    }
  }

  private async handleOffer(socket: Socket, data: { roomId: string; from: string; to: string; offer: any }): Promise<void> {
    try {
      this.logger.debug(`Offer from ${data.from} to ${data.to}`);

      // 使用信令服務處理 Offer
      await this.signalService.handleOffer({
        roomId: data.roomId,
        from: data.from,
        to: data.to,
        offer: data.offer
      });

      // 轉發 Offer 到目標對等端
      this.forwardToClient(data.to, 'offer', {
        from: data.from,
        offer: data.offer
      });
      
      // 更新房間連接統計
      this.updateRoomStats(data.roomId);
    } catch (error) {
      this.logger.error(`Error handling offer:`, error);
      socket.emit('error', {
        message: error.message
      });
    }
  }

  private async handleAnswer(socket: Socket, data: { roomId: string; from: string; to: string; answer: any }): Promise<void> {
    try {
      this.logger.debug(`Answer from ${data.from} to ${data.to}`);

      // 使用信令服務處理 Answer
      await this.signalService.handleAnswer({
        roomId: data.roomId,
        from: data.from,
        to: data.to,
        answer: data.answer
      });

      // 轉發 Answer 到目標對等端
      this.forwardToClient(data.to, 'answer', {
        from: data.from,
        answer: data.answer
      });
      
      // 更新房間連接統計
      this.updateRoomStats(data.roomId);
    } catch (error) {
      this.logger.error(`Error handling answer:`, error);
      socket.emit('error', {
        message: error.message
      });
    }
  }
  
  // 處理重連請求
  private async handleReconnectRequest(socket: Socket, data: { roomId: string; from: string; to: string }): Promise<void> {
    try {
      this.logger.info(`Reconnect request from ${data.from} to ${data.to} in room ${data.roomId}`);
      
      // 檢查目標玩家是否仍在房間中
      const room = await this.roomRepository.findById(data.roomId);
      if (!room || !room.hasPlayer(data.to)) {
        socket.emit('error', {
          code: 'ERR_PEER_NOT_FOUND',
          message: `Peer ${data.to} is not in room ${data.roomId}`
        });
        return;
      }
      
      // 通知對方需要重新建立連接
      this.forwardToClient(data.to, 'reconnect-needed', {
        from: data.from
      });
      
      this.logger.info(`Sent reconnect notification to ${data.to}`);
    } catch (error) {
      this.logger.error(`Error handling reconnect request:`, error);
      socket.emit('error', {
        message: error.message
      });
    }
  }
  
  // 處理連接狀態變更
  private async handleConnectionState(_socket: Socket, data: { roomId: string; peerId: string; state: string }): Promise<void> {
    try {
      this.logger.debug(`Connection state update from ${data.peerId}: ${data.state}`);
      
      // 更新連接狀態
      await this.connectionService.updateConnectionState(data.peerId, data.state as any);
      
      // 如果連接失敗，可能需要通知其他玩家
      if (data.state === 'failed' || data.state === 'disconnected') {
        // 獲取與該玩家相關的所有連接
        const connections = await this.peerRepository.findByPeerId(data.peerId);
        
        // 通知所有相關玩家
        for (const connection of connections) {
          // 只通知另一端的玩家
          const targetPeerId = connection.localPeerId === data.peerId 
            ? connection.remotePeerId
            : connection.localPeerId;
            
          // 通知另一端玩家連接狀態變更
          this.forwardToClient(targetPeerId, 'peer-connection-state', {
            peerId: data.peerId,
            state: data.state
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error handling connection state update:`, error);
    }
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    try {
      const { roomId, peerId } = socket.data;

      if (!roomId || !peerId) {
        return;
      }

      this.logger.info(`Socket disconnected: ${socket.id}, peerId: ${peerId}, roomId: ${roomId}`);

      // 從客戶端列表中移除
      if (this.clients.has(peerId as string)) {
        const clientSet = this.clients.get(peerId as string);
        if (clientSet) {
          clientSet.delete(socket);
          if (clientSet.size === 0) {
            this.clients.delete(peerId as string);
            
            // 處理連接狀態變更
            await this.connectionService.updateConnectionState(peerId as string, 'disconnected');
            
            // 通過使用案例處理玩家離開房間
            const leaveRoomUseCase = new LeaveRoomUseCase(this.roomRepository, this.eventPublisher);
            await leaveRoomUseCase.execute({
              roomId: roomId as string,
              peerId: peerId as string
            });
            
            // 通知房間中的其他玩家有玩家離開
            this.io.to(roomId as string).emit('player-left', {
              peerId: peerId as string,
              roomId: roomId as string
            });
            
            // 更新房間統計
            this.updateRoomStats(roomId as string);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling disconnect:', error);
    }
  }

  private forwardToClient(peerId: string, event: string, data: any): void {
    if (this.clients.has(peerId)) {
      const clientSet = this.clients.get(peerId);
      if (clientSet) {
        for (const socket of clientSet) {
          socket.emit(event, data);
        }
      }
    } else {
      this.logger.warn(`Cannot forward to peer ${peerId}: not connected`);
    }
  }
  
  // 更新房間連接統計
  private async updateRoomStats(roomId: string, playerCount?: number): Promise<void> {
    try {
      // 獲取房間連接數量
      const connections = await this.peerRepository.findByRoomId(roomId);
      
      // 更新或創建統計
      if (!this.roomStats.has(roomId)) {
        this.roomStats.set(roomId, {
          roomId,
          playerCount: playerCount || 0,
          connectionCount: connections.length,
          lastUpdated: Date.now()
        });
      } else {
        const stats = this.roomStats.get(roomId)!;
        stats.connectionCount = connections.length;
        if (playerCount !== undefined) {
          stats.playerCount = playerCount;
        }
        stats.lastUpdated = Date.now();
      }
      
      const stats = this.roomStats.get(roomId)!;
      
      // 檢查連接數與玩家數比例
      if (stats.playerCount > 0) {
        const expectedConnections = stats.playerCount * (stats.playerCount - 1) / 2;
        const ratio = stats.connectionCount / expectedConnections;
        
        if (ratio < 0.8 && stats.playerCount > 1) {
          this.logger.warn(`Room ${roomId} has incomplete connections: ${stats.connectionCount}/${expectedConnections} (${Math.round(ratio * 100)}%)`);
        }
        
        // 如果連接數異常高，記錄警告
        if (stats.connectionCount > expectedConnections * 1.5) {
          this.logger.warn(`Room ${roomId} has excessive connections: ${stats.connectionCount}/${expectedConnections}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating room stats for ${roomId}:`, error);
    }
  }
  
  // 定期監控房間連接狀態
  private async monitorRooms(): Promise<void> {
    try {
      this.logger.debug(`Monitoring ${this.roomStats.size} rooms`);
      const now = Date.now();
      
      // 清理舊的房間統計
      for (const [roomId, stats] of this.roomStats.entries()) {
        if (now - stats.lastUpdated > 10 * 60 * 1000) { // 10分鐘
          this.roomStats.delete(roomId);
          continue;
        }
        
        // 檢查長時間不活躍的房間
        if (now - stats.lastUpdated > 5 * 60 * 1000) { // 5分鐘
          try {
            const room = await this.roomRepository.findById(roomId);
            if (!room || !room.isActive || room.players.size === 0) {
              this.roomStats.delete(roomId);
            }
          } catch (error) {
            this.logger.error(`Error checking inactive room ${roomId}:`, error);
          }
        }
      }
      
      // 輸出統計摘要
      if (this.roomStats.size > 0) {
        const totalConnections = Array.from(this.roomStats.values())
          .reduce((sum, stats) => sum + stats.connectionCount, 0);
        const totalPlayers = Array.from(this.roomStats.values())
          .reduce((sum, stats) => sum + stats.playerCount, 0);
          
        this.logger.info(`Room stats: ${this.roomStats.size} rooms, ${totalPlayers} players, ${totalConnections} connections`);
      }
    } catch (error) {
      this.logger.error('Error monitoring rooms:', error);
    }
  }
} 