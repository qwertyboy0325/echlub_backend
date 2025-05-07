import Logger from '../../../../shared/utils/logger';

interface Metrics {
  activeConnections: number;
  roomCount: number;
  messageRate: number;
  averageLatency: number;
  signalCounts: {
    offer: number;
    answer: number;
    iceCandidate: number;
    error: number;
  };
}

export class MonitoringService {
  private readonly logger: Logger;
  private metrics: Metrics = {
    activeConnections: 0,
    roomCount: 0,
    messageRate: 0,
    averageLatency: 0,
    signalCounts: {
      offer: 0,
      answer: 0,
      iceCandidate: 0,
      error: 0
    }
  };

  // 追蹤訊息數量用於計算訊息率
  private messageCount: number = 0;
  private lastMessageRateCalculation: number = Date.now();
  
  // 信令計數（當前周期）
  private currentSignalCounts = {
    offer: 0,
    answer: 0,
    iceCandidate: 0,
    error: 0
  };

  constructor() {
    this.logger = new Logger(MonitoringService.name);
    
    // 每5秒計算一次訊息率
    setInterval(() => this.calculateMessageRate(), 5000);
    
    // 每60秒重置信令計數
    setInterval(() => this.resetSignalCounts(), 60000);
  }

  // 增加活躍連接數
  incrementActiveConnections(): void {
    this.metrics.activeConnections++;
    this.logger.debug(`Active connections: ${this.metrics.activeConnections}`);
  }

  // 減少活躍連接數
  decrementActiveConnections(): void {
    if (this.metrics.activeConnections > 0) {
      this.metrics.activeConnections--;
    }
    this.logger.debug(`Active connections: ${this.metrics.activeConnections}`);
  }

  // 設置房間數量
  setRoomCount(count: number): void {
    this.metrics.roomCount = count;
    this.logger.debug(`Room count: ${this.metrics.roomCount}`);
  }

  // 增加訊息計數
  incrementMessageCount(): void {
    this.messageCount++;
  }

  // 記錄信令事件
  recordSignalingEvent(type: 'offer' | 'answer' | 'ice-candidate' | 'error'): void {
    this.incrementMessageCount();
    
    // 根據訊息類型增加計數
    switch (type) {
      case 'offer':
        this.currentSignalCounts.offer++;
        this.metrics.signalCounts.offer++;
        break;
      case 'answer':
        this.currentSignalCounts.answer++;
        this.metrics.signalCounts.answer++;
        break;
      case 'ice-candidate':
        this.currentSignalCounts.iceCandidate++;
        this.metrics.signalCounts.iceCandidate++;
        break;
      case 'error':
        this.currentSignalCounts.error++;
        this.metrics.signalCounts.error++;
        break;
    }
    
    // 定期記錄信令統計
    if (
      this.currentSignalCounts.offer + 
      this.currentSignalCounts.answer + 
      this.currentSignalCounts.iceCandidate > 100
    ) {
      this.logSignalCounts();
    }
  }
  
  // 記錄當前信令計數
  private logSignalCounts(): void {
    this.logger.debug('Signal counts', {
      offer: this.currentSignalCounts.offer,
      answer: this.currentSignalCounts.answer,
      iceCandidate: this.currentSignalCounts.iceCandidate,
      error: this.currentSignalCounts.error
    });
  }
  
  // 重置當前周期的信令計數
  private resetSignalCounts(): void {
    this.currentSignalCounts = {
      offer: 0,
      answer: 0,
      iceCandidate: 0,
      error: 0
    };
  }

  // 計算訊息率 (每秒訊息數)
  private calculateMessageRate(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastMessageRateCalculation) / 1000;
    
    if (elapsedSeconds > 0) {
      this.metrics.messageRate = this.messageCount / elapsedSeconds;
      this.messageCount = 0;
      this.lastMessageRateCalculation = now;
      this.logger.debug(`Message rate: ${this.metrics.messageRate.toFixed(2)} messages/sec`);
    }
  }

  // 記錄延遲
  recordLatency(latencyMs: number): void {
    // 使用簡單的移動平均值計算方法
    this.metrics.averageLatency = 0.8 * this.metrics.averageLatency + 0.2 * latencyMs;
    this.logger.debug(`Average latency: ${this.metrics.averageLatency.toFixed(2)} ms`);
  }

  // 取得當前指標
  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  // 定期收集和發送指標
  async collectMetrics(): Promise<void> {
    try {
      this.logger.info('Collecting metrics', {
        activeConnections: this.metrics.activeConnections,
        roomCount: this.metrics.roomCount,
        messageRate: this.metrics.messageRate.toFixed(2),
        averageLatency: this.metrics.averageLatency.toFixed(2),
        signalCounts: {
          offer: this.metrics.signalCounts.offer,
          answer: this.metrics.signalCounts.answer,
          iceCandidate: this.metrics.signalCounts.iceCandidate,
          error: this.metrics.signalCounts.error
        }
      });
      
      // 在這裡可以實作將指標發送到監控系統的邏輯
      // 例如 Prometheus, CloudWatch, Datadog 等
      
    } catch (error) {
      this.logger.error('Error collecting metrics:', error);
    }
  }
} 