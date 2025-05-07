import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';
import { RoomRuleVO } from '../value-objects/room-rule.vo';

export class RoomCreatedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.room-created';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly ownerId: string,
    public readonly rules: RoomRuleVO
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      ownerId: this.ownerId,
      rules: this.rules.toJSON()
    };
  }
}

export class PlayerJoinedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.player-joined';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly peerId: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      peerId: this.peerId
    };
  }
}

export class PlayerLeftEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.player-left';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly peerId: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      peerId: this.peerId
    };
  }
}

export class RoomRuleChangedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.room-rule-changed';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly rules: RoomRuleVO
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      rules: this.rules.toJSON()
    };
  }
}

export class RoomClosedEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.room-closed';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId
    };
  }
} 