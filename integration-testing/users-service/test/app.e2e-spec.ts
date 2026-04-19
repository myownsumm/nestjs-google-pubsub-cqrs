import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { getByPath, PubSubService, waitForEventName } from 'nestjs-google-pubsub-cqrs';
import { AppModule } from './../src/app.module';

/**
 * These tests call `PubSubService.connect` during app bootstrap.
 * Run the Pub/Sub emulator (see repo `integration-testing/docker-compose.yml`) so `localhost:8085` is reachable.
 */
describe('AppController (e2e)', () => {
  jest.setTimeout(120000);

  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it(
    'POST /users/create publishes UserCreatedEvent observable on PubSubService.read$()',
    async () => {
      const pubSub = app.get(PubSubService);
      const eventPromise = waitForEventName(
        pubSub.read$(),
        'UserCreatedEvent',
        { timeoutMs: 15000 },
      );

      await request(app.getHttpServer())
        .post('/users/create')
        .send({ userId: 'e2e-user-id', email: 'e2e@example.com' })
        .expect(201);

      const msg = await eventPromise;
      expect(msg.eventInitiator).toBe('users-service-sub');
      expect(getByPath(msg.eventBody, 'payload.userId')).toBe('e2e-user-id');
      expect(getByPath(msg.eventBody, 'payload.email')).toBe('e2e@example.com');
    },
    20000,
  );
});
