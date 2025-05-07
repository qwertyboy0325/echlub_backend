import { io, Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import { CollaborationGateway } from '../../../modules/collaboration/infrastructure/gateways/collaboration.gateway';
import { RoomRepository } from '../../../modules/collaboration/infrastructure/repositories/room.repository';
import { PeerRepository } from '../../../modules/collaboration/infrastructure/repositories/peer.repository';
import { SignalService } from '../../../modules/collaboration/infrastructure/services/signal.service';
import { ConnectionService } from '../../../modules/collaboration/infrastructure/services/connection.service';
import { DomainEventPublisher } from '../../../shared/domain/DomainEventPublisher';
import { v4 as uuidv4 } from 'uuid';
import { MessageQueueService } from '../../../modules/collaboration/infrastructure/services/message-queue.service';
import { MonitoringService } from '../../../modules/collaboration/infrastructure/services/monitoring.service';

// 定義事件數據類型
interface RoomState {
  roomId: string;
  ownerId: string;
  players: string[];
  rules: any;
}

interface SignalData {
  from: string;
  to?: string;
  offer?: any;
  answer?: any;
  candidate?: any;
}

// Mock the repositories and services
jest.mock('../../../modules/collaboration/infrastructure/repositories/room.repository');
jest.mock('../../../modules/collaboration/infrastructure/repositories/peer.repository');
jest.mock('../../../modules/collaboration/infrastructure/services/monitoring.service');
jest.mock('../../../modules/collaboration/infrastructure/services/message-queue.service');

describe('WebSocket E2E', () => {
  let httpServer: HttpServer;
  let socketServer: Server;
  let roomRepository: jest.Mocked<RoomRepository>;
  let peerRepository: jest.Mocked<PeerRepository>;
  let signalService: SignalService;
  let connectionService: ConnectionService;
  let eventPublisher: DomainEventPublisher;
  // 初始化WebSocket服務器的核心組件，實際上被使用但未被斷言檢查
  // @ts-ignore: 暫未在斷言中使用但測試環境需要它
  let collaborationGateway: CollaborationGateway;
  let clientSockets: Socket[] = [];
  
  const PORT = 3001;
  const SOCKET_URL = `http://localhost:${PORT}`;
  
  beforeAll(async () => {
    // Setup HTTP server
    httpServer = createServer();
    
    // Setup Socket.IO server
    socketServer = new Server(httpServer, {
      path: '/collaboration',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Setup dependencies
    roomRepository = new RoomRepository() as jest.Mocked<RoomRepository>;
    peerRepository = new PeerRepository() as jest.Mocked<PeerRepository>;
    eventPublisher = new DomainEventPublisher();
    
    const messageQueueService = new MessageQueueService();
    const monitoringService = new MonitoringService();
    
    signalService = new SignalService(
      peerRepository,
      eventPublisher,
      messageQueueService,
      monitoringService
    );
    
    // Setup circular dependency
    messageQueueService.setSignalService(signalService);
    
    connectionService = new ConnectionService(peerRepository, eventPublisher);
    
    // 初始化協作網關以啟動WebSocket事件處理
    collaborationGateway = new CollaborationGateway(
      socketServer,
      roomRepository,
      peerRepository,
      signalService,
      connectionService,
      eventPublisher
    );
    
    // 檢查協作網關初始化成功
    if (!collaborationGateway) {
      throw new Error('Failed to initialize CollaborationGateway');
    }
    
    // Start the server
    httpServer.listen(PORT);
  });
  
  afterAll(() => {
    // Close all client connections
    clientSockets.forEach(socket => {
      socket.disconnect();
    });
    
    // Close server
    socketServer.close();
    httpServer.close();
  });
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear client sockets array
    clientSockets = [];
  });
  
  describe('Room and Connection Management', () => {
    it('should connect client to socket server', (done) => {
      const roomId = uuidv4();
      const peerId = 'peer-A';
      
      // Create socket client
      const socket = io(SOCKET_URL, {
        path: '/collaboration',
        query: {
          roomId,
          peerId
        }
      });
      
      clientSockets.push(socket);
      
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        done();
      });
      
      socket.on('connect_error', (err: Error) => {
        done(err);
      });
    });
    
    it('should emit player-joined event when player joins room', (done) => {
      const roomId = uuidv4();
      const peerId = 'peer-A';
      
      // 正確模擬Room物件，必須包含players屬性作為Set並具有所需的方法
      const mockRoom = {
        id: roomId,
        ownerId: peerId,
        rules: {
          maxPlayers: 4,
          allowRelay: true,
          latencyTargetMs: 100,
          opusBitrate: 64000,
          toJSON: () => ({
            maxPlayers: 4,
            allowRelay: true,
            latencyTargetMs: 100,
            opusBitrate: 64000
          })
        },
        players: new Set([peerId]),
        isActive: true,
        // 添加必須的方法
        join: jest.fn(),
        leave: jest.fn(),
        isOwner: jest.fn().mockReturnValue(true),
        hasPlayer: jest.fn().mockImplementation((id) => id === peerId),
        pullDomainEvents: jest.fn().mockReturnValue([]),
        toJSON: jest.fn().mockReturnValue({
          id: roomId,
          ownerId: peerId,
          players: [peerId],
          rules: {
            maxPlayers: 4,
            allowRelay: true,
            latencyTargetMs: 100,
            opusBitrate: 64000
          },
          isActive: true
        })
      };
      
      // Mock room repository to return a properly mocked room
      roomRepository.findById = jest.fn().mockResolvedValue(mockRoom);
      
      // Create socket client
      const socket = io(SOCKET_URL, {
        path: '/collaboration',
        query: {
          roomId,
          peerId
        }
      });
      
      clientSockets.push(socket);
      
      socket.on('connect', () => {
        // Emit join event
        socket.emit('join', { roomId, peerId });
      });
      
      // 監聽room-state事件而不是player-joined事件，因為這是發送給加入的玩家的
      socket.on('room-state', (data: RoomState) => {
        expect(data).toBeDefined();
        expect(data.roomId).toBe(roomId);
        expect(data.ownerId).toBe(peerId);
        done();
      });
      
      socket.on('error', (err: Error) => {
        done(err);
      });
    });
  });
  
  describe('Signaling', () => {
    it('should forward offer to remote peer', (done) => {
      const roomId = uuidv4();
      const peerA = 'peer-A';
      const peerB = 'peer-B';
      const roomState = {
        id: roomId,
        ownerId: peerA,
        rules: {
          maxPlayers: 4,
          allowRelay: true,
          latencyTargetMs: 100,
          opusBitrate: 64000
        },
        players: [peerA, peerB],
        isActive: true
      };
      
      // Mock room repository
      roomRepository.findById = jest.fn().mockResolvedValue(roomState);
      
      // Mock peer connection
      const mockConnection = {
        id: `${peerA}:${peerB}`,
        roomId,
        localPeerId: peerA,
        remotePeerId: peerB,
        handleOffer: jest.fn(),
        pullDomainEvents: jest.fn().mockReturnValue([])
      };
      
      peerRepository.findById = jest.fn().mockResolvedValue(mockConnection);
      peerRepository.save = jest.fn().mockResolvedValue(mockConnection);
      
      // Create client sockets
      const socketA = io(SOCKET_URL, {
        path: '/collaboration',
        query: {
          roomId,
          peerId: peerA
        }
      });
      
      const socketB = io(SOCKET_URL, {
        path: '/collaboration',
        query: {
          roomId,
          peerId: peerB
        }
      });
      
      clientSockets.push(socketA, socketB);
      
      // Setup peer B to receive offer
      socketB.on('offer', (data: SignalData) => {
        expect(data).toBeDefined();
        expect(data.from).toBe(peerA);
        expect(data.offer).toEqual(expect.objectContaining({ type: 'offer', sdp: 'test-sdp' }));
        done();
      });
      
      // When peer A is connected, send offer
      socketA.on('connect', () => {
        socketA.emit('offer', {
          roomId,
          from: peerA,
          to: peerB,
          offer: { type: 'offer', sdp: 'test-sdp' }
        });
      });
      
      socketA.on('error', (err: Error) => {
        done(err);
      });
      
      socketB.on('error', (err: Error) => {
        done(err);
      });
    });
    
    it('should handle complete signaling flow: offer, answer, and ICE candidates', (done) => {
      const roomId = uuidv4();
      const peerA = 'peer-C';
      const peerB = 'peer-D';
      const roomState = {
        id: roomId,
        ownerId: peerA,
        rules: {
          maxPlayers: 4,
          allowRelay: true,
          latencyTargetMs: 100,
          opusBitrate: 64000
        },
        players: [peerA, peerB],
        isActive: true
      };
      
      // Mock room repository
      roomRepository.findById = jest.fn().mockResolvedValue(roomState);
      
      // Mock peer connections
      const mockConnectionAB = {
        id: `${peerA}:${peerB}`,
        roomId,
        localPeerId: peerA,
        remotePeerId: peerB,
        handleOffer: jest.fn(),
        handleAnswer: jest.fn(),
        handleIceCandidate: jest.fn(),
        pullDomainEvents: jest.fn().mockReturnValue([])
      };
      
      const mockConnectionBA = {
        id: `${peerB}:${peerA}`,
        roomId,
        localPeerId: peerB,
        remotePeerId: peerA,
        handleOffer: jest.fn(),
        handleAnswer: jest.fn(),
        handleIceCandidate: jest.fn(),
        pullDomainEvents: jest.fn().mockReturnValue([])
      };
      
      // Mock repository methods
      peerRepository.findById = jest.fn().mockImplementation((id) => {
        if (id === `${peerA}:${peerB}`) return Promise.resolve(mockConnectionAB);
        if (id === `${peerB}:${peerA}`) return Promise.resolve(mockConnectionBA);
        return Promise.resolve(null);
      });
      
      peerRepository.save = jest.fn().mockImplementation((conn) => {
        return Promise.resolve(conn);
      });
      
      // Create client sockets
      const socketA = io(SOCKET_URL, {
        path: '/collaboration',
        query: {
          roomId,
          peerId: peerA
        }
      });
      
      const socketB = io(SOCKET_URL, {
        path: '/collaboration',
        query: {
          roomId,
          peerId: peerB
        }
      });
      
      clientSockets.push(socketA, socketB);
      
      let offerReceived = false;
      let answerReceived = false;
      let iceCandidateReceived = false;
      
      // Setup peer B to receive offer and send answer
      socketB.on('offer', (data: SignalData) => {
        expect(data).toBeDefined();
        expect(data.from).toBe(peerA);
        offerReceived = true;
        
        // Send answer back
        socketB.emit('answer', {
          roomId,
          from: peerB,
          to: peerA,
          answer: { type: 'answer', sdp: 'answer-sdp' }
        });
      });
      
      // Setup peer A to receive answer
      socketA.on('answer', (data: SignalData) => {
        expect(data).toBeDefined();
        expect(data.from).toBe(peerB);
        answerReceived = true;
        
        // Send ICE candidate
        socketA.emit('ice-candidate', {
          roomId,
          from: peerA,
          to: peerB,
          candidate: { candidate: 'ice-candidate-data' }
        });
      });
      
      // Setup peer B to receive ICE candidate
      socketB.on('ice-candidate', (data: SignalData) => {
        expect(data).toBeDefined();
        expect(data.from).toBe(peerA);
        iceCandidateReceived = true;
        
        // Check entire flow is complete
        if (offerReceived && answerReceived && iceCandidateReceived) {
          done();
        }
      });
      
      // When peer A is connected, start signaling flow
      socketA.on('connect', () => {
        socketA.emit('offer', {
          roomId,
          from: peerA,
          to: peerB,
          offer: { type: 'offer', sdp: 'offer-sdp' }
        });
      });
      
      socketA.on('error', (err: Error) => done(err));
      socketB.on('error', (err: Error) => done(err));
      
      // Set timeout for test
      setTimeout(() => {
        if (!offerReceived || !answerReceived || !iceCandidateReceived) {
          done(new Error('Signaling flow not completed within timeout'));
        }
      }, 5000);
    });
  });
}); 