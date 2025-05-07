import Logger from '../../../../shared/utils/logger';
import type { SignalService } from './signal.service';

interface SignalMessage {
  type: string;
  data: Record<string, any>;
  priority?: number; // 越低優先級越高
  timestamp: number;
}

export class MessageQueueService {
  private readonly logger: Logger;
  private readonly queue: Map<string, SignalMessage[]> = new Map();
  private readonly processInterval: number = 100; // 處理間隔（毫秒）
  private readonly batchSize: number = 10; // 批次處理數量
  private isProcessing: boolean = false;
  private signalService?: SignalService;

  constructor() {
    this.logger = new Logger(MessageQueueService.name);
    
    // 定期處理佇列
    setInterval(() => this.processAllQueues(), this.processInterval);
  }

  // 設置信令服務（避免循環依賴）
  setSignalService(signalService: SignalService): void {
    this.signalService = signalService;
  }

  async enqueue(roomId: string, message: Omit<SignalMessage, 'timestamp' | 'priority'>): Promise<void> {
    try {
      if (!this.queue.has(roomId)) {
        this.queue.set(roomId, []);
      }
      
      const roomQueue = this.queue.get(roomId);
      if (roomQueue) {
        // 加入訊息並設置優先級和時間戳
        const priority = this.getMessagePriority(message.type);
        roomQueue.push({
          ...message,
          priority,
          timestamp: Date.now()
        });
        
        // 根據優先級排序
        roomQueue.sort((a, b) => (a.priority || 10) - (b.priority || 10));
      }
      this.logger.debug(`Message enqueued for room ${roomId}: ${message.type}`);
      
      // 檢查佇列大小
      this.checkQueueSize(roomId);
    } catch (error) {
      this.logger.error(`Error enqueuing message for room ${roomId}:`, error);
      throw error;
    }
  }

  // 檢查佇列大小，避免佇列過長
  private checkQueueSize(roomId: string): void {
    const queueSize = this.getQueueSize(roomId);
    if (queueSize > 1000) {
      this.logger.warn(`Large queue size for room ${roomId}: ${queueSize} messages`);
      
      // 移除過期的 ICE candidate 訊息（超過5秒未處理的）
      const roomQueue = this.queue.get(roomId);
      if (roomQueue) {
        const now = Date.now();
        const filtered = roomQueue.filter(msg => {
          const isOld = now - msg.timestamp > 5000;
          const isIceCandidate = msg.type === 'ice-candidate';
          return !(isOld && isIceCandidate);
        });
        
        if (filtered.length < roomQueue.length) {
          this.logger.info(`Removed ${roomQueue.length - filtered.length} old ice candidates from queue`);
          this.queue.set(roomId, filtered);
        }
      }
    }
  }

  private async processAllQueues(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      for (const [roomId, messages] of this.queue.entries()) {
        if (messages.length > 0) {
          await this.processQueue(roomId);
        }
      }
    } catch (error) {
      this.logger.error('Error processing message queues:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueue(roomId: string): Promise<void> {
    if (!this.signalService) {
      this.logger.warn('Cannot process queue: SignalService not set');
      return;
    }
    
    const messages = this.queue.get(roomId) || [];
    
    if (messages.length === 0) {
      return;
    }

    try {
      // 批次處理訊息
      const batch = messages.slice(0, this.batchSize);
      const processingMap = new Map<string, any>();
      
      for (const message of batch) {
        try {
          const { type, data } = message;
          
          // 獲取連接ID
          const connectionId = `${data.from}:${data.to}`;
          
          // 合併相同連接的訊息
          if (!processingMap.has(connectionId)) {
            processingMap.set(connectionId, { ...data });
          } else {
            // 只有某些訊息類型需要合併
            if (type === 'ice-candidate') {
              const existing = processingMap.get(connectionId);
              if (!existing.candidates) {
                existing.candidates = [];
              }
              existing.candidates.push(data.candidate);
            }
          }
        } catch (err) {
          this.logger.error(`Error processing message in batch: ${err.message}`);
        }
      }
      
      // 處理合併後的訊息
      const promises = Array.from(processingMap.entries()).map(([connectionId, data]) => {
        return this.signalService?.batchProcessConnection(connectionId, data);
      });
      
      await Promise.all(promises);
      
      // 從佇列中移除已處理的訊息
      this.queue.set(roomId, messages.slice(this.batchSize));
      
      this.logger.debug(`Processed ${batch.length} messages for room ${roomId}, ${this.queue.get(roomId)?.length || 0} remaining`);
    } catch (error) {
      this.logger.error(`Error processing message batch for room ${roomId}:`, error);
    }
  }

  // 根據訊息類型設置優先級
  private getMessagePriority(type: string): number {
    switch (type) {
      case 'offer':
        return 1; // 最高優先級
      case 'answer':
        return 2;
      case 'ice-candidate':
        return 3;
      default:
        return 10;
    }
  }

  getQueueSize(roomId: string): number {
    return this.queue.get(roomId)?.length || 0;
  }

  getTotalQueueSize(): number {
    let total = 0;
    for (const messages of this.queue.values()) {
      total += messages.length;
    }
    return total;
  }

  clearQueue(roomId: string): void {
    this.queue.delete(roomId);
    this.logger.debug(`Queue cleared for room ${roomId}`);
  }
} 