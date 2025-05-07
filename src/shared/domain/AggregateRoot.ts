import { Entity } from './Entity';
import { IDomainEvent } from './IDomainEvent';

export abstract class AggregateRoot<T> extends Entity<T> {
    private domainEvents: IDomainEvent[] = [];

    constructor(id: T) {
        super(id);
    }

    protected addDomainEvent(event: IDomainEvent): void {
        this.domainEvents.push(event);
    }

    public pullDomainEvents(): IDomainEvent[] {
        const events = [...this.domainEvents];
        this.domainEvents = [];
        return events;
    }

    public clearDomainEvents(): void {
        this.domainEvents = [];
    }
} 