export abstract class DomainEvent {
  public readonly occurredOn: Date;

  constructor(public readonly eventName: string) {
    this.occurredOn = new Date();
  }

  abstract toJSON(): Record<string, any>;
} 