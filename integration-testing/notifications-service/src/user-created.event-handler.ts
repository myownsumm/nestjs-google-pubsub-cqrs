import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from './user-created.event';
import { logArtifact } from '../../shared/artifact-logger';

@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler
  implements IEventHandler<UserCreatedEvent>
{
  async handle(event: UserCreatedEvent) {
    await logArtifact(
      'notifications-service',
      `UserCreatedEvent received: ${event.payload.userId}, ${event.payload.email}`,
    );
  }
}
