import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

interface ConnectionState {
  state: string;
  timestamp: string;
}

@Entity('peer_connections')
export class PeerConnectionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column()
  localPeerId: string;

  @Column()
  remotePeerId: string;

  @Column('jsonb')
  connectionState: ConnectionState;

  @Column()
  iceCandidatesCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 