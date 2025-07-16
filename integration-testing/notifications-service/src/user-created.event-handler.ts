import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from './user-created.event';

@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler
  implements IEventHandler<UserCreatedEvent>
{
  async handle(event: UserCreatedEvent) {
    console.log(`UserCreatedEvent received: ${event.payload.userId}, ${event.payload.email}`);
  }
}
