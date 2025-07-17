import { BaseEvent } from 'nestjs-google-pubsub-cqrs';

export interface UserCreatedEventPayload {
  userId: string;
  email: string;
}

export class UserCreatedEvent implements BaseEvent {
  constructor(public readonly payload: UserCreatedEventPayload) {}
}
