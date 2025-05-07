import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';

export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export class ConnectionStateChangedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.connection-state-changed';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly peerId: string,
    public readonly state: ConnectionState,
    public readonly previousState: ConnectionState
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      peerId: this.peerId,
      state: this.state,
      previousState: this.previousState
    };
  }
}

export class IceCandidateReceivedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.ice-candidate-received';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly from: string,
    public readonly to: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      from: this.from,
      to: this.to
    };
  }
}

export class OfferReceivedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.offer-received';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly from: string,
    public readonly to: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      from: this.from,
      to: this.to
    };
  }
}

export class AnswerReceivedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.answer-received';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly from: string,
    public readonly to: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      from: this.from,
      to: this.to
    };
  }
}

export class ConnectionTimeoutEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.connection-timeout';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly peerId: string,
    public readonly timeoutMs: number
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      peerId: this.peerId,
      timeoutMs: this.timeoutMs
    };
  }
} 