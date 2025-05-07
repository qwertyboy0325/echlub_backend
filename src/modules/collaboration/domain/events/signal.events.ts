import { IDomainEvent } from '../../../../shared/domain/IDomainEvent';

// WebRTC 相關型別定義
export interface RTCIceCandidate {
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
}

export interface RTCSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export class SignalIceCandidateEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.signal-ice-candidate';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly candidate: RTCIceCandidate
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      from: this.from,
      to: this.to,
      candidate: this.candidate
    };
  }
}

export class SignalOfferEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.signal-offer';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly offer: RTCSessionDescription
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      from: this.from,
      to: this.to,
      offer: this.offer
    };
  }
}

export class SignalAnswerEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.signal-answer';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly from: string,
    public readonly to: string,
    public readonly answer: RTCSessionDescription
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      from: this.from,
      to: this.to,
      answer: this.answer
    };
  }
}

export class SignalErrorEvent implements IDomainEvent {
  public readonly eventName: string = 'collab.signal-error';
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly roomId: string,
    public readonly peerId: string,
    public readonly operation: string,
    public readonly message: string
  ) {}

  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      roomId: this.roomId,
      peerId: this.peerId,
      operation: this.operation,
      message: this.message
    };
  }
} 