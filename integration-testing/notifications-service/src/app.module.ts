import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';
import { UserCreatedEventHandler } from './user-created.event-handler';
import { UserLicenseUpgradeSaga } from './user-license-upgrade.saga';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'notifications-service-sub',
      topicName: 'integration-events-topic',
      projectId: 'integration-test-project',
      apiEndpoint: 'localhost',
      port: 8085,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, UserCreatedEventHandler, UserLicenseUpgradeSaga],
})
export class AppModule {}
