export interface IDomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  toJSON(): Record<string, any>;
} 