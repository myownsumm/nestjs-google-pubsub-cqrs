import { Module } from '@nestjs/common';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'notifications-service-sub',
      topicName: 'integration-events-topic',
      projectId: 'integration-test-project',
      apiEndpoint: 'localhost', // for local emulator
      port: 8085, // for local emulator
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
