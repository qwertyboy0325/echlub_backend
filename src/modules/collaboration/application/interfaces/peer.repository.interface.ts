import { PeerConnection } from '../../domain/aggregates/peer-connection.aggregate';

export interface IPeerRepository {
  findById(id: string): Promise<PeerConnection | null>;
  findByRoomId(roomId: string): Promise<PeerConnection[]>;
  findByPeerId(peerId: string): Promise<PeerConnection[]>;
  save(peerConnection: PeerConnection): Promise<void>;
  delete(id: string): Promise<void>;
} 