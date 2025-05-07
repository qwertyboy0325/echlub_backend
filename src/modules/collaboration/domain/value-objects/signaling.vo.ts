import { RTCIceCandidate, RTCSessionDescription } from "../events/signal.events";

export class SignalingMessageVO {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly timestamp: Date = new Date()
  ) {}

  toJSON(): Record<string, any> {
    return {
      from: this.from,
      to: this.to,
      timestamp: this.timestamp
    };
  }
}

export class IceCandidateVO {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly candidate: RTCIceCandidate
  ) {}

  toJSON(): Record<string, any> {
    return {
      from: this.from,
      to: this.to,
      candidate: this.candidate
    };
  }
}

export class OfferVO {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly offer: RTCSessionDescription
  ) {}

  toJSON(): Record<string, any> {
    return {
      from: this.from,
      to: this.to,
      offer: this.offer
    };
  }
}

export class AnswerVO {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly answer: RTCSessionDescription
  ) {}

  toJSON(): Record<string, any> {
    return {
      from: this.from,
      to: this.to,
      answer: this.answer
    };
  }
} 