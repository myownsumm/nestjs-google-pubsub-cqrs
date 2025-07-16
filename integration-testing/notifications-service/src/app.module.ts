import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'notifications-service-sub',
      topicName: 'integration-events-topic',
      projectId: 'integration-test-project',
      apiEndpoint: 'localhost', // optional, for local emulator
      port: 8085, // optional, for local emulator
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
