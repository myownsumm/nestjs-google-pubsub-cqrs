import { Module } from '@nestjs/common';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';
import { UsersServiceController } from './users-service.controller';
import { UsersServiceService } from './users-service.service';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'users-service-sub',
      topicName: 'integration-events-topic',
      projectId: 'integration-test-project',
      apiEndpoint: 'localhost', // for local emulator
      port: 8085, // for local emulator
    }),
  ],
  controllers: [UsersServiceController],
  providers: [UsersServiceService],
})
export class UsersServiceModule {}
