import { IPeerRepository } from '../../application/interfaces/peer.repository.interface';
import { PeerConnection } from '../../domain/aggregates/peer-connection.aggregate';
import { ConnectionStateType } from '../../domain/value-objects/connection-state.vo';
import type { DomainEventPublisher } from '../../../../shared/domain/DomainEventPublisher';
import Logger from '../../../../shared/utils/logger';

interface ConnectionHealth {
  connectionId: string;
  localPeerId: string;
  remotePeerId: string;
  roomId: string;
  state: ConnectionStateType;
  lastUpdated: number;
  reconnectAttempts: number;
}

export class ConnectionService {
  private readonly logger: Logger;
  private readonly connectionStates: Map<string, ConnectionHealth> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly STALE_CONNECTION_THRESHOLD = 30000; // 30 秒

  constructor(
    private readonly peerRepository: IPeerRepository,
    private readonly eventPublisher: DomainEventPublisher
  ) {
    this.logger = new Logger(ConnectionService.name);
    
    // 啟動連接健康監控
    setInterval(() => this.monitorConnections(), 10000);
    
    // 定期清理過期連接
    setInterval(() => this.cleanupStaleConnections(), 60000);
  }

  async updateConnectionState(
    peerId: string,
    state: ConnectionStateType
  ): Promise<void> {
    try {
      this.logger.debug(`Updating connection state for peer ${peerId} to ${state}`);

      // 查找與該對等端相關的所有連接
      const connections = await this.peerRepository.findByPeerId(peerId);

      if (connections.length === 0) {
        this.logger.warn(`No connections found for peer ${peerId}`);
        return;
      }

      // 更新所有連接的狀態
      for (const connection of connections) {
        connection.updateConnectionState(state);

        // 在內存中追蹤連接健康狀態
        const connectionId = connection.id;
        const health: ConnectionHealth = {
          connectionId,
          localPeerId: connection.localPeerId,
          remotePeerId: connection.remotePeerId,
          roomId: connection.roomId,
          state,
          lastUpdated: Date.now(),
          reconnectAttempts: 0
        };
        
        // 如果是已經有記錄的連接，保留重連嘗試次數
        if (this.connectionStates.has(connectionId)) {
          const existing = this.connectionStates.get(connectionId);
          if (existing) {
            health.reconnectAttempts = existing.reconnectAttempts;
            
            // 如果狀態從斷開恢復，重置重連嘗試次數
            if (state === 'connected' && 
                (existing.state === 'disconnected' || existing.state === 'failed')) {
              health.reconnectAttempts = 0;
              this.logger.info(`Connection ${connectionId} recovered from ${existing.state} state`);
            }
            
            // 如果狀態變為斷開，增加重連嘗試次數
            if ((state === 'disconnected' || state === 'failed') && 
                 existing.state === 'connected') {
              health.reconnectAttempts += 1;
              this.logger.warn(`Connection ${connectionId} changed to ${state}, reconnect attempt: ${health.reconnectAttempts}`);
            }
          }
        }
        
        this.connectionStates.set(connectionId, health);

        // 儲存變更
        await this.peerRepository.save(connection);

        // 發布領域事件
        const events = (connection as any).pullDomainEvents();
        await this.eventPublisher.publishAll(events);
      }

    } catch (error) {
      this.logger.error(`Error updating connection state for peer ${peerId}:`, error);
      throw error;
    }
  }

  async getConnectionsByRoomId(roomId: string): Promise<PeerConnection[]> {
    try {
      return await this.peerRepository.findByRoomId(roomId);
    } catch (error) {
      this.logger.error(`Error getting connections for room ${roomId}:`, error);
      throw error;
    }
  }
  
  // 監控所有連接的健康狀態
  private async monitorConnections(): Promise<void> {
    try {
      this.logger.debug(`Monitoring ${this.connectionStates.size} connections`);
      const now = Date.now();
      
      // 檢查所有連接
      for (const [connectionId, health] of this.connectionStates.entries()) {
        // 檢查是否長時間未更新
        if (now - health.lastUpdated > this.STALE_CONNECTION_THRESHOLD) {
          if (health.state === 'connected') {
            this.logger.warn(`Connection ${connectionId} has not been updated for ${(now - health.lastUpdated) / 1000}s`);
            
            // 嘗試ping連接或觸發重連
            await this.triggerReconnection(connectionId, health);
          }
        }
        
        // 檢查失敗的連接
        if (health.state === 'failed' && health.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          await this.triggerReconnection(connectionId, health);
        }
      }
    } catch (error) {
      this.logger.error('Error monitoring connections:', error);
    }
  }
  
  // 觸發重連
  private async triggerReconnection(connectionId: string, health: ConnectionHealth): Promise<void> {
    try {
      if (health.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        this.logger.error(`Max reconnect attempts reached for connection ${connectionId}`);
        return;
      }
      
      // 增加重連嘗試次數
      health.reconnectAttempts += 1;
      health.lastUpdated = Date.now();
      this.connectionStates.set(connectionId, health);
      
      this.logger.info(`Triggering reconnection for ${connectionId}, attempt ${health.reconnectAttempts}`);
      
      // 在這裡實作觸發重連的邏輯
      // 例如發送信令事件通知前端重新建立連接
      
      // TODO: 實際重連邏輯
      
    } catch (error) {
      this.logger.error(`Error triggering reconnection for ${connectionId}:`, error);
    }
  }

  async cleanupStaleConnections(): Promise<void> {
    try {
      const now = Date.now();
      let removedCount = 0;
      
      // 清理過期的連接
      for (const [connectionId, health] of this.connectionStates.entries()) {
        // 移除超過一定時間未更新且狀態不是connected的連接
        if (now - health.lastUpdated > 5 * 60000 && health.state !== 'connected') {
          this.connectionStates.delete(connectionId);
          removedCount++;
          
          // 也從持久層中移除
          try {
            await this.peerRepository.delete(connectionId);
          } catch (err) {
            this.logger.error(`Failed to delete connection ${connectionId} from repository:`, err);
          }
        }
        
        // 移除重連嘗試超過最大次數的連接
        if (health.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS && 
            (health.state === 'disconnected' || health.state === 'failed')) {
          this.connectionStates.delete(connectionId);
          removedCount++;
          
          // 也從持久層中移除
          try {
            await this.peerRepository.delete(connectionId);
          } catch (err) {
            this.logger.error(`Failed to delete connection ${connectionId} from repository:`, err);
          }
        }
      }
      
      if (removedCount > 0) {
        this.logger.info(`Cleaned up ${removedCount} stale connections`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up stale connections:', error);
    }
  }
  
  // 提供連接健康狀態統計
  getConnectionStats(): Record<string, number> {
    const stats = {
      total: this.connectionStates.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      failed: 0,
      new: 0
    };
    
    for (const health of this.connectionStates.values()) {
      switch (health.state) {
        case 'connected':
          stats.connected++;
          break;
        case 'connecting':
          stats.connecting++;
          break;
        case 'disconnected':
          stats.disconnected++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'new':
          stats.new++;
          break;
      }
    }
    
    return stats;
  }
} 