import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { RoomRuleVO } from '../value-objects/room-rule.vo';
import {
  RoomCreatedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  RoomRuleChangedEvent,
  RoomClosedEvent
} from '../events/room.events';

export type RoomProps = {
  ownerId: string;
  rules: RoomRuleVO;
  players: Set<string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class Room extends AggregateRoot<string> {
  private readonly _ownerId: string;
  private _rules: RoomRuleVO;
  private _players: Set<string>;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: string, props: RoomProps) {
    super(id);
    this._ownerId = props.ownerId;
    this._rules = props.rules;
    this._players = props.players;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public static create(id: string, props: RoomProps): Room {
    const room = new Room(id, props);
    room.addDomainEvent(new RoomCreatedEvent(id, props.ownerId, props.rules));
    return room;
  }

  // 用於從持久化儲存重建聚合根，不會觸發事件
  public static reconstruct(id: string, props: RoomProps): Room {
    return new Room(id, props);
  }

  public join(peerId: string): void {
    if (!this._isActive) {
      throw new Error('Room is not active');
    }

    if (this._players.size >= this._rules.maxPlayers) {
      throw new Error('Room is full');
    }

    if (this._players.has(peerId)) {
      throw new Error('Player already in room');
    }

    this._players.add(peerId);
    this._updatedAt = new Date();
    this.addDomainEvent(new PlayerJoinedEvent(this['id'], peerId));
  }

  public leave(peerId: string): void {
    if (!this._players.has(peerId)) {
      throw new Error('Player not in room');
    }

    this._players.delete(peerId);
    this._updatedAt = new Date();
    this.addDomainEvent(new PlayerLeftEvent(this['id'], peerId));

    // 如果房間空了，關閉房間
    if (this._players.size === 0) {
      this.close();
    }
  }

  public updateRules(rules: RoomRuleVO): void {
    if (!this._isActive) {
      throw new Error('Room is not active');
    }

    this._rules = rules;
    this._updatedAt = new Date();
    this.addDomainEvent(new RoomRuleChangedEvent(this['id'], rules));
  }

  public close(): void {
    if (!this._isActive) {
      throw new Error('Room is already closed');
    }

    this._isActive = false;
    this._updatedAt = new Date();
    this.addDomainEvent(new RoomClosedEvent(this['id']));
  }

  // Getters
  get ownerId(): string {
    return this._ownerId;
  }

  get rules(): RoomRuleVO {
    return this._rules;
  }

  get players(): Set<string> {
    return new Set(this._players);
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // 檢查是否為房主
  isOwner(peerId: string): boolean {
    return this._ownerId === peerId;
  }

  // 檢查玩家是否在房間中
  hasPlayer(peerId: string): boolean {
    return this._players.has(peerId);
  }

  // 獲取房間狀態
  toJSON(): Record<string, any> {
    return {
      id: this['id'],
      ownerId: this._ownerId,
      rules: this._rules.toJSON(),
      players: Array.from(this._players),
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
} 