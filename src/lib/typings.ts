import { IEvent } from '@nestjs/cqrs';

/**
 * Interface for events that carry a payload.
 * All events should have a structured payload containing event data.
 */
export interface PayloadableEvent {
  /** The event payload containing all relevant data */
  payload: object;
}

/**
 * Base interface that all events should implement when using this library.
 * This is the clean public API that users should extend from.
 * 
 * @example
 * ```typescript
 * export class UserCreatedEvent implements BaseEvent {
 *   constructor(public readonly payload: { userId: string; email: string }) {}
 * }
 * ```
 */
export interface BaseEvent extends IEvent, PayloadableEvent {
}

/**
 * Internal interface for events that have been processed through Pub/Sub.
 * Contains the _eventInitiator field used for filtering and preventing message loops.
 * This is used internally by the module and should not be implemented by users.
 */
export interface PubSubEvent extends BaseEvent {
  /** Identifier of the service that initiated the event (used for filtering) */
  _eventInitiator: string;
}
