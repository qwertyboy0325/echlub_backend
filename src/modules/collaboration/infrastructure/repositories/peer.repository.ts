import { PeerConnection, PeerConnectionProps } from '../../domain/aggregates/peer-connection.aggregate';
import { IPeerRepository } from '../../application/interfaces/peer.repository.interface';
import { PeerConnectionEntity } from '../entities/peer-connection.entity';
import { AppDataSource } from '../../../../config/database';
import { ConnectionStateVO } from '../../domain/value-objects/connection-state.vo';
import { Repository } from 'typeorm';
import Logger from '../../../../shared/utils/logger';

export class PeerRepository implements IPeerRepository {
  private readonly repository: Repository<PeerConnectionEntity>;
  private readonly logger: Logger;

  constructor() {
    this.repository = AppDataSource.getRepository(PeerConnectionEntity);
    this.logger = new Logger(PeerRepository.name);
  }

  async findById(id: string): Promise<PeerConnection | null> {
    try {
      const connectionEntity = await this.repository.findOne({
        where: { id }
      });

      if (!connectionEntity) {
        return null;
      }

      return this.mapToDomain(connectionEntity);
    } catch (error) {
      this.logger.error(`Error finding peer connection by ID ${id}:`, error);
      throw error;
    }
  }

  async findByRoomId(roomId: string): Promise<PeerConnection[]> {
    try {
      const connectionEntities = await this.repository.find({
        where: { roomId }
      });

      return connectionEntities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.logger.error(`Error finding peer connections by room ID ${roomId}:`, error);
      throw error;
    }
  }

  async findByPeerId(peerId: string): Promise<PeerConnection[]> {
    try {
      const connectionEntities = await this.repository.find({
        where: [
          { localPeerId: peerId },
          { remotePeerId: peerId }
        ]
      });

      return connectionEntities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.logger.error(`Error finding peer connections by peer ID ${peerId}:`, error);
      throw error;
    }
  }

  async save(peerConnection: PeerConnection): Promise<void> {
    try {
      const connectionEntity = this.mapToEntity(peerConnection);
      await this.repository.save(connectionEntity);
    } catch (error) {
      this.logger.error(`Error saving peer connection ${peerConnection['id']}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      this.logger.error(`Error deleting peer connection ${id}:`, error);
      throw error;
    }
  }

  private mapToDomain(entity: PeerConnectionEntity): PeerConnection {
    // 將存儲的連線狀態映射到值物件
    const connectionState = new ConnectionStateVO(
      entity.remotePeerId,
      entity.connectionState.state as any,
      new Date(entity.connectionState.timestamp)
    );

    // 建立領域物件
    const props: PeerConnectionProps = {
      roomId: entity.roomId,
      localPeerId: entity.localPeerId,
      remotePeerId: entity.remotePeerId,
      connectionState: connectionState,
      iceCandidatesCount: entity.iceCandidatesCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    // 使用私有建構子方法建立 PeerConnection 實例
    return PeerConnection.reconstruct(entity.id as any, props);
  }

  private mapToEntity(connection: PeerConnection): PeerConnectionEntity {
    const entity = new PeerConnectionEntity();
    entity.id = connection['id'] as string;
    entity.roomId = connection.roomId;
    entity.localPeerId = connection.localPeerId;
    entity.remotePeerId = connection.remotePeerId;
    entity.connectionState = {
      state: connection.connectionState.state,
      timestamp: connection.connectionState.timestamp.toISOString()
    };
    entity.iceCandidatesCount = connection.iceCandidatesCount;
    entity.createdAt = connection.createdAt;
    entity.updatedAt = connection.updatedAt;
    return entity;
  }
} 