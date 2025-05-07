import { IDomainEvent } from './IDomainEvent';

export interface DomainEventHandler {
  handle(event: IDomainEvent): Promise<void>;
}

export class DomainEventPublisher {
  private readonly handlers: Map<string, DomainEventHandler[]> = new Map();

  constructor() {}

  register(eventName: string, handler: DomainEventHandler): void {
    const existingHandlers = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, [...existingHandlers, handler]);
  }

  unregister(eventName: string, handler: DomainEventHandler): void {
    const existingHandlers = this.handlers.get(eventName) || [];
    this.handlers.set(
      eventName,
      existingHandlers.filter(h => h !== handler)
    );
  }

  async publish(event: IDomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName) || [];
    const promises = eventHandlers.map(handler => handler.handle(event));
    await Promise.all(promises);
  }

  async publishAll(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
} 