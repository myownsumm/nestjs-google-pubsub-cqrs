import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'users-service-sub',
      topicName: 'integration-events-topic',
      projectId: 'integration-test-project',
      apiEndpoint: 'localhost',
      port: 8085
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
