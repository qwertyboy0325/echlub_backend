import { AggregateRoot } from '../../../../shared/domain/AggregateRoot';
import { ConnectionStateVO, ConnectionStateType } from '../value-objects/connection-state.vo';
import {
  ConnectionStateChangedEvent,
  IceCandidateReceivedEvent,
  OfferReceivedEvent,
  AnswerReceivedEvent,
  ConnectionTimeoutEvent
} from '../events/connection.events';

export type PeerConnectionId = `${string}:${string}`;

export type PeerConnectionProps = {
  roomId: string;
  localPeerId: string;
  remotePeerId: string;
  connectionState: ConnectionStateVO;
  iceCandidatesCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export class PeerConnection extends AggregateRoot<PeerConnectionId> {
  private readonly _roomId: string;
  private readonly _localPeerId: string;
  private readonly _remotePeerId: string;
  private _connectionState: ConnectionStateVO;
  private _iceCandidatesCount: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: PeerConnectionId, props: PeerConnectionProps) {
    super(id);
    this._roomId = props.roomId;
    this._localPeerId = props.localPeerId;
    this._remotePeerId = props.remotePeerId;
    this._connectionState = props.connectionState;
    this._iceCandidatesCount = props.iceCandidatesCount;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public static create(
    roomId: string,
    localPeerId: string,
    remotePeerId: string
  ): PeerConnection {
    const id = `${localPeerId}:${remotePeerId}` as PeerConnectionId;
    const now = new Date();
    
    const connection = new PeerConnection(id, {
      roomId,
      localPeerId,
      remotePeerId,
      connectionState: ConnectionStateVO.createNew(remotePeerId),
      iceCandidatesCount: 0,
      createdAt: now,
      updatedAt: now
    });

    return connection;
  }

  // 用於從持久化儲存重建聚合根，不會觸發事件
  public static reconstruct(id: PeerConnectionId, props: PeerConnectionProps): PeerConnection {
    return new PeerConnection(id, props);
  }

  public updateConnectionState(state: ConnectionStateType): void {
    if (this._connectionState.state === state) {
      return;
    }

    const previousState = this._connectionState.state;
    this._connectionState = this._connectionState.update(state);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new ConnectionStateChangedEvent(
        this._roomId,
        this._remotePeerId,
        state,
        previousState
      )
    );

    // If connection failed or disconnected for too long, emit timeout event
    if (
      (state === 'failed' || state === 'disconnected') &&
      this._connectionState.timestamp.getTime() - this._updatedAt.getTime() > 30000
    ) {
      this.addDomainEvent(
        new ConnectionTimeoutEvent(
          this._roomId,
          this._remotePeerId,
          30000
        )
      );
    }
  }

  public handleIceCandidate(): void {
    this._iceCandidatesCount++;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new IceCandidateReceivedEvent(
        this._roomId,
        this._localPeerId,
        this._remotePeerId
      )
    );
  }

  public handleOffer(): void {
    this.updateConnectionState('connecting');
    this._updatedAt = new Date();

    this.addDomainEvent(
      new OfferReceivedEvent(
        this._roomId,
        this._localPeerId,
        this._remotePeerId
      )
    );
  }

  public handleAnswer(): void {
    this.updateConnectionState('connected');
    this._updatedAt = new Date();

    this.addDomainEvent(
      new AnswerReceivedEvent(
        this._roomId,
        this._localPeerId,
        this._remotePeerId
      )
    );
  }

  // Getters
  get roomId(): string {
    return this._roomId;
  }

  get localPeerId(): string {
    return this._localPeerId;
  }

  get remotePeerId(): string {
    return this._remotePeerId;
  }

  get connectionState(): ConnectionStateVO {
    return this._connectionState;
  }

  get iceCandidatesCount(): number {
    return this._iceCandidatesCount;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // 檢查連線是否建立
  isConnected(): boolean {
    return this._connectionState.isConnected();
  }

  // 檢查是否需要重連
  needsReconnection(): boolean {
    return this._connectionState.needsReconnection();
  }

  // 獲取連線狀態
  toJSON(): Record<string, any> {
    return {
      id: this['id'],
      roomId: this._roomId,
      localPeerId: this._localPeerId,
      remotePeerId: this._remotePeerId,
      connectionState: this._connectionState.toJSON(),
      iceCandidatesCount: this._iceCandidatesCount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
} 