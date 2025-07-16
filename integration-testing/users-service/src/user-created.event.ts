export interface UserCreatedEventPayload {
  userId: string;
  email: string;
}

export class UserCreatedEvent {
  constructor(public readonly payload: UserCreatedEventPayload) {}
} 