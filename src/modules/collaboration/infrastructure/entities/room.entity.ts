import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

interface RoomRules {
  maxPlayers: number;
  allowRelay: boolean;
  latencyTargetMs: number;
  opusBitrate: number;
}

@Entity('rooms')
export class RoomEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column('jsonb')
  rules: RoomRules;

  @Column('simple-array')
  players: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 