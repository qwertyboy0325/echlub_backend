import { IPeerRepository } from '../../application/interfaces/peer.repository.interface';
import { PeerConnection } from '../../domain/aggregates/peer-connection.aggregate';
import type { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';
import { MessageQueueService } from './message-queue.service';
import type { MonitoringService } from './monitoring.service';
import { 
  SignalIceCandidateEvent, 
  SignalOfferEvent, 
  SignalAnswerEvent,
  SignalErrorEvent,
  RTCIceCandidate,
  RTCSessionDescription
} from '../../domain/events/signal.events';
import { 
  IceCandidateVO, 
  OfferVO, 
  AnswerVO 
} from '../../domain/value-objects/signaling.vo';

interface SignalData {
  roomId: string;
  from: string;
  to: string;
  candidate?: RTCIceCandidate;
  offer?: RTCSessionDescription;
  answer?: RTCSessionDescription;
}

export class SignalService {
  private readonly logger: Logger;
  private readonly processingConnections: Set<string> = new Set();
  private readonly MAX_BATCH_SIZE: number = 10;
  private readonly PROCESSING_DELAY: number = 50; // 處理延遲（毫秒）

  constructor(
    private readonly peerRepository: IPeerRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly messageQueueService: MessageQueueService,
    private readonly monitoringService: MonitoringService
  ) {
    this.logger = new Logger(SignalService.name);
  }

  async handleIceCandidate(data: {
    roomId: string;
    from: string;
    to: string;
    candidate: any;
  }): Promise<void> {
    try {
      this.logger.debug(`Queueing ICE candidate from ${data.from} to ${data.to}`);
      
      // 將訊息加入佇列
      await this.messageQueueService.enqueue(data.roomId, {
        type: 'ice-candidate',
        data
      });
      
      // 記錄信令指標
      this.monitoringService.recordSignalingEvent('ice-candidate');
      
    } catch (error) {
      this.logger.error('Error handling ICE candidate:', error);
      throw error;
    }
  }

  async handleOffer(data: {
    roomId: string;
    from: string;
    to: string;
    offer: any;
  }): Promise<void> {
    try {
      this.logger.debug(`Queueing offer from ${data.from} to ${data.to}`);
      
      // 將訊息加入佇列，Offer 具有高優先級
      await this.messageQueueService.enqueue(data.roomId, {
        type: 'offer',
        data
      });
      
      // 記錄信令指標
      this.monitoringService.recordSignalingEvent('offer');
      
    } catch (error) {
      this.logger.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(data: {
    roomId: string;
    from: string;
    to: string;
    answer: any;
  }): Promise<void> {
    try {
      this.logger.debug(`Queueing answer from ${data.from} to ${data.to}`);
      
      // 將訊息加入佇列，Answer 具有高優先級
      await this.messageQueueService.enqueue(data.roomId, {
        type: 'answer',
        data
      });
      
      // 記錄信令指標
      this.monitoringService.recordSignalingEvent('answer');
      
    } catch (error) {
      this.logger.error('Error handling answer:', error);
      throw error;
    }
  }

  // 批次處理連接狀態更新，減少資料庫操作
  async batchProcessConnection(connectionId: string, connectionData: any): Promise<void> {
    // 避免同一個連接同時被多個請求處理
    if (this.processingConnections.has(connectionId)) {
      return;
    }
    
    try {
      this.processingConnections.add(connectionId);
      
      // 獲取連接
      const connection = await this.getOrCreatePeerConnection(
        connectionData.roomId,
        connectionData.from,
        connectionData.to
      );
      
      // 根據訊息類型處理
      if (connectionData.candidate) {
        connection.handleIceCandidate();
      } else if (connectionData.offer) {
        connection.handleOffer();
      } else if (connectionData.answer) {
        connection.handleAnswer();
      }
      
      // 每 100ms 才保存一次，減少資料庫操作
      await this.peerRepository.save(connection);
      
      // 發布領域事件
      const events = (connection as any).pullDomainEvents();
      await this.eventPublisher.publishAll(events);
      
    } catch (error) {
      this.logger.error(`Error processing connection ${connectionId}:`, error);
    } finally {
      // 延遲移除處理標記，避免頻繁操作
      setTimeout(() => {
        this.processingConnections.delete(connectionId);
      }, this.PROCESSING_DELAY);
    }
  }

  private async getOrCreatePeerConnection(
    roomId: string,
    localPeerId: string,
    remotePeerId: string
  ): Promise<PeerConnection> {
    // 生成唯一的連接ID
    const connectionId = `${localPeerId}:${remotePeerId}`;
    
    try {
      // 嘗試查找已存在的連接
      let connection = await this.peerRepository.findById(connectionId);

      // 如果不存在，建立新的連接
      if (!connection) {
        this.logger.debug(`Creating new peer connection: ${connectionId}`);
        connection = PeerConnection.create(
          roomId,
          localPeerId,
          remotePeerId
        );
      }

      return connection;
    } catch (error) {
      this.logger.error(`Error getting/creating peer connection ${connectionId}:`, error);
      throw error;
    }
  }
} 