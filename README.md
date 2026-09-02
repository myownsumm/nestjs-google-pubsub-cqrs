# nestjs-google-pubsub-cqrs

[![npm version](https://badge.fury.io/js/nestjs-google-pubsub-cqrs.svg)](https://badge.fury.io/js/nestjs-google-pubsub-cqrs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Google Pub/Sub integration for NestJS CQRS that enables seamless event-driven communication between microservices.

## 🚀 Features

- **Seamless NestJS Integration**: Drop-in replacement for the default NestJS CQRS event bus
- **Google Pub/Sub Powered**: Leverages Google Cloud Pub/Sub for reliable message delivery
- **Event-Driven Architecture**: Perfect for microservices communication
- **Type-Safe**: Full TypeScript support with proper type definitions
- **Auto-Discovery**: Automatically discovers and registers event handlers
- **Flexible Configuration**: Support for both synchronous and asynchronous configuration
- **E2E testing helpers**: Generic `GlobalBusMessage` observers (waits, sequences, payload paths) and an optional dedicated Pub/Sub listener for out-of-process tests

## 📦 Installation

```bash
npm install nestjs-google-pubsub-cqrs
```

> **Note:** This package lists `@nestjs/common`, `@nestjs/core`, and `@nestjs/cqrs` as peer dependencies. You must install these packages in your own application:
>
> ```bash
> npm install @nestjs/common @nestjs/core @nestjs/cqrs
> ```
>
> This approach ensures that your application uses a single instance of each NestJS package, avoiding issues that can arise from having multiple versions or instances of these core dependencies (such as dependency injection errors or unexpected behavior in your NestJS app).

## 🏗️ Prerequisites

- Node.js 16+
- NestJS 8+
- Google Cloud Pub/Sub topic and subscription
- Google Cloud authentication configured

## 🚀 Quick Start

### 1. Basic Setup

Replace your existing `CqrsModule` with `PubSubCqrsModule`:

```typescript
import { Module } from "@nestjs/common";
import { PubSubCqrsModule } from "nestjs-google-pubsub-cqrs";

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: "my-service-subscription",
      topicName: "my-events-topic",
      projectId: "my-gcp-project",
      apiEndpoint: "localhost", // Optional: for local development
      port: 8085, // Optional: for local development
    }),
  ],
})
export class AppModule {}
```

### 2. Create Events

Define your events using the provided `BaseEvent` interface:

```typescript
import { BaseEvent } from "nestjs-google-pubsub-cqrs";

export interface UserCreatedPayload {
  userId: string;
  email: string;
  name: string;
}

export class UserCreatedEvent implements BaseEvent {
  constructor(public readonly payload: UserCreatedPayload) {}
}
```

### 3. Publish Events

Inject and use the `EventBus` to publish events:

```typescript
import { Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";
import { UserCreatedEvent } from "./events/user-created.event";

@Injectable()
export class UserService {
  constructor(private readonly eventBus: EventBus) {}

  async createUser(userData: any) {
    // ... user creation logic

    // Publish event to Google Pub/Sub
    await this.eventBus.publish(
      new UserCreatedEvent({
        userId: user.id,
        email: user.email,
        name: user.name,
      })
    );
  }
}
```

### 4. Handle Events

Create event handlers using NestJS CQRS decorators:

```typescript
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { UserCreatedEvent } from "./events/user-created.event";

@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  handle(event: UserCreatedEvent) {
    console.log("User created:", event.payload);
    // Handle the event (send email, update analytics, etc.)
  }
}
```

## ⚙️ Configuration

### Synchronous Configuration

```typescript
PubSubCqrsModule.forRoot({
  subscriptionName: "my-service-subscription",
  topicName: "my-events-topic",
  projectId: "my-gcp-project",
  apiEndpoint: "localhost", // Optional
  port: 8085, // Optional
});
```

### Asynchronous Configuration

```typescript
PubSubCqrsModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    subscriptionName: configService.get("PUBSUB_SUBSCRIPTION"),
    topicName: configService.get("PUBSUB_TOPIC"),
    projectId: configService.get("GCP_PROJECT_ID"),
    apiEndpoint: configService.get("PUBSUB_ENDPOINT"),
    port: configService.get("PUBSUB_PORT"),
  }),
  inject: [ConfigService],
});
```

### Configuration Options

| Option             | Type     | Required | Description                                        |
| ------------------ | -------- | -------- | -------------------------------------------------- |
| `subscriptionName` | `string` | ✅       | Google Pub/Sub subscription name                   |
| `topicName`        | `string` | ✅       | Google Pub/Sub topic name                          |
| `projectId`        | `string` | ✅       | Google Cloud Project ID                            |
| `apiEndpoint`      | `string` | ❌       | Custom API endpoint (useful for local development) |
| `port`             | `number` | ❌       | Custom port (useful for local development)         |

## 🏢 Microservices Architecture

### Service A (Publisher)

```typescript
// user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly eventBus: EventBus) {}

  async createUser(userData: CreateUserDto) {
    const user = await this.userRepository.save(userData);

    // This event will be published to Google Pub/Sub
    await this.eventBus.publish(
      new UserCreatedEvent({
        userId: user.id,
        email: user.email,
        name: user.name,
      })
    );

    return user;
  }
}
```

### Service B (Subscriber)

```typescript
// notification.service.ts
@EventsHandler(UserCreatedEvent)
export class SendWelcomeEmailHandler
  implements IEventHandler<UserCreatedEvent>
{
  constructor(private readonly emailService: EmailService) {}

  async handle(event: UserCreatedEvent) {
    await this.emailService.sendWelcomeEmail(
      event.payload.email,
      event.payload.name
    );
  }
}
```

## 🔧 Local Development with Google Pub/Sub Emulator

For local development, you can use the Google Pub/Sub emulator instead of connecting to actual Google Cloud Pub/Sub. This library provides a pre-configured Docker image that makes local development seamless.

### Quick Start with Docker Compose

The easiest way to get started is using Docker Compose. Create a `docker-compose.yml` file in your project:

```yaml
services:
  pubsub-emulator:
    image: myownsumm/nestjs-google-pubsub-emulator:latest
    container_name: pubsub-emulator
    ports:
      - "8085:8090"
    environment:
      - PUBSUB_PROJECT_ID=your-local-project
      - PUBSUB_EMULATOR_PORT=8090
      - PUBSUB_TOPIC=your-events-topic
      - PUBSUB_SUBSCRIPTION=your-service-subscription
    healthcheck:
      test: ["CMD", "sh", "-c", "netstat -tulpen | grep 0.0.0.0:8090"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped
```

### Start the Emulator

```bash
# Start the emulator in background
docker compose up -d

# Or start with logs visible
docker compose up
```

### Configure Your NestJS Application

Update your NestJS module configuration to connect to the local emulator:

```typescript
import { Module } from '@nestjs/common';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'your-service-subscription',
      topicName: 'your-events-topic',
      projectId: 'your-local-project',
      apiEndpoint: 'localhost', // Points to emulator
      port: 8085, // Emulator port
    }),
  ],
})
export class AppModule {}
```

### Environment-Based Configuration

For better flexibility between local and production environments:

```typescript
PubSubCqrsModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    subscriptionName: configService.get('PUBSUB_SUBSCRIPTION'),
    topicName: configService.get('PUBSUB_TOPIC'),
    projectId: configService.get('PUBSUB_PROJECT_ID'),
    // Only set these for local development
    apiEndpoint: configService.get('PUBSUB_API_ENDPOINT'), // 'localhost' for local
    port: configService.get('PUBSUB_PORT'), // 8085 for local
  }),
  inject: [ConfigService],
});
```

### Environment Variables

Create a `.env` file for local development:

```bash
# Local development with emulator
PUBSUB_PROJECT_ID=your-local-project
PUBSUB_TOPIC=your-events-topic
PUBSUB_SUBSCRIPTION=your-service-subscription
PUBSUB_API_ENDPOINT=localhost
PUBSUB_PORT=8085

# For production, remove PUBSUB_API_ENDPOINT and PUBSUB_PORT
# PUBSUB_PROJECT_ID=your-production-project-id
# PUBSUB_TOPIC=your-production-topic
# PUBSUB_SUBSCRIPTION=your-production-subscription
```

### Multi-Service Setup

For microservices architecture, each service should have its own subscription but share the same topic:

**Service A (Publisher)**
```typescript
PubSubCqrsModule.forRoot({
  subscriptionName: 'service-a-subscription',
  topicName: 'shared-events-topic',
  projectId: 'your-local-project',
  apiEndpoint: 'localhost',
  port: 8085,
})
```

**Service B (Subscriber)**
```typescript
PubSubCqrsModule.forRoot({
  subscriptionName: 'service-b-subscription',
  topicName: 'shared-events-topic', // Same topic
  projectId: 'your-local-project',
  apiEndpoint: 'localhost',
  port: 8085,
})
```

### Docker Compose for Multiple Services

```yaml
services:
  pubsub-emulator:
    image: myownsumm/nestjs-google-pubsub-emulator:latest
    container_name: pubsub-emulator
    ports:
      - "8085:8090"
    environment:
      - PUBSUB_PROJECT_ID=microservices-local
      - PUBSUB_EMULATOR_PORT=8090
      - PUBSUB_TOPIC=shared-events-topic
      - PUBSUB_SUBSCRIPTION=monitoring-subscription
    healthcheck:
      test: ["CMD", "sh", "-c", "netstat -tulpen | grep 0.0.0.0:8090"]
      interval: 10s
      timeout: 5s
      retries: 3

  users-service:
    build: ./users-service
    ports:
      - "3001:3000"
    depends_on:
      pubsub-emulator:
        condition: service_healthy
    environment:
      - PUBSUB_PROJECT_ID=microservices-local
      - PUBSUB_TOPIC=shared-events-topic
      - PUBSUB_SUBSCRIPTION=users-service-subscription
      - PUBSUB_API_ENDPOINT=pubsub-emulator
      - PUBSUB_PORT=8090

  notifications-service:
    build: ./notifications-service
    ports:
      - "3002:3000"
    depends_on:
      pubsub-emulator:
        condition: service_healthy
    environment:
      - PUBSUB_PROJECT_ID=microservices-local
      - PUBSUB_TOPIC=shared-events-topic
      - PUBSUB_SUBSCRIPTION=notifications-service-subscription
      - PUBSUB_API_ENDPOINT=pubsub-emulator
      - PUBSUB_PORT=8090
```

### Alternative: Direct Docker Run

If you prefer not to use Docker Compose:

```bash
# Start the emulator
docker run -d \
  --name pubsub-emulator \
  -p 8085:8090 \
  -e PUBSUB_PROJECT_ID=your-local-project \
  -e PUBSUB_EMULATOR_PORT=8090 \
  -e PUBSUB_TOPIC=your-events-topic \
  -e PUBSUB_SUBSCRIPTION=your-service-subscription \
  myownsumm/nestjs-google-pubsub-emulator:latest

# Stop the emulator
docker stop pubsub-emulator
docker rm pubsub-emulator
```

### Emulator Configuration Options

The emulator Docker image supports these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PUBSUB_PROJECT_ID` | Project ID for emulator | `test-project` |
| `PUBSUB_EMULATOR_PORT` | Internal emulator port | `8090` |
| `PUBSUB_TOPIC` | Topic to create on startup | `events-topic` |
| `PUBSUB_SUBSCRIPTION` | Subscription to create on startup | `events-subscription` |

### Troubleshooting Local Development

**Connection Issues**
- Ensure the emulator is running: `docker ps`
- Check emulator logs: `docker logs pubsub-emulator`
- Verify port mapping: emulator runs on internal port 8090, mapped to host port 8085

**Events Not Being Delivered**
- Each service must have a unique `subscriptionName`
- All services should use the same `topicName`
- Verify your event handlers are properly registered

**Docker Issues**
- Pull the latest image: `docker pull myownsumm/nestjs-google-pubsub-emulator:latest`
- Clean up containers: `docker compose down && docker compose up -d`

### Production Deployment

When deploying to production, simply remove the `apiEndpoint` and `port` configurations:

```typescript
// Production configuration
PubSubCqrsModule.forRoot({
  subscriptionName: 'your-service-subscription',
  topicName: 'your-events-topic',
  projectId: 'your-production-project-id',
  // No apiEndpoint or port - uses Google Cloud Pub/Sub
})
```

## 📚 API Reference

### PubSubCqrsModule

The main module that replaces NestJS `CqrsModule`.

#### Static Methods

- `forRoot(options: IConnectionOptions): DynamicModule`
- `forRootAsync(options: any): DynamicModule`

### BaseEvent

Interface that all events should implement.

```typescript
interface BaseEvent extends IEvent, PayloadableEvent {
  payload: object;
}
```

### PubSubService

Service for direct interaction with Google Pub/Sub (advanced usage).

#### Methods

- `connect(options: IConnectionOptions): Promise<void>`
- `read$(): Observable<GlobalBusMessage>`
- `write(message: GlobalBusMessage): Promise<void>`

### IConnectionOptions

Configuration interface for Pub/Sub connection.

```typescript
interface IConnectionOptions {
  subscriptionName: string;
  topicName: string;
  projectId: string;
  apiEndpoint?: string;
  port?: number;
  /** Max time (ms) to wait for a single RPC before treating it as timed out. Default: 5000 */
  connectionTimeoutMs?: number;
  /** Max connection attempts (initial + retries) before giving up. Default: 3 */
  maxConnectionAttempts?: number;
  /** Base delay (ms) between attempts, grows linearly. Default: 1000 */
  retryDelayMs?: number;
}
```

### Bounded, classified connection failures

`PubSubService.connect()` bounds every underlying Pub/Sub RPC (`getTopics`, `getSubscriptions`, subscription creation) to `connectionTimeoutMs` and retries up to `maxConnectionAttempts` times. A backend that accepts a TCP/gRPC connection but never actually serves RPCs — e.g. an emulator whose port is open while its process is still starting — now fails fast with a classified `PubSubConnectionError` instead of silently consuming the underlying gRPC client's own, much longer (~60s) internal deadline.

```typescript
import { PubSubConnectionError, PubSubConnectionFailureReason } from "nestjs-google-pubsub-cqrs";

try {
  await pubSubService.connect({ subscriptionName, topicName, projectId, apiEndpoint, port });
} catch (error) {
  if (error instanceof PubSubConnectionError) {
    // error.reason: PubSubConnectionFailureReason.TIMEOUT | RPC_ERROR
    // error.attempts, error.elapsedMs, error.cause
  }
  throw error;
}
```

This is orthogonal to, and does not replace, the Docker healthcheck on the emulator image (see `docker-image/healthcheck.js`), which now performs the same kind of real RPC check at the container level so `depends_on: condition: service_healthy` is a truthful readiness signal, not just a port check.

## E2E testing: observing the global bus

This section is **only for automated end-to-end tests** (Jest, Playwright test runner in Node, etc.). It is **not** part of normal application runtime wiring.

Messages on the wire use **`GlobalBusMessage`**: `{ eventName, eventBody, eventInitiator }`. The helpers below work with any `Observable<GlobalBusMessage>` so you can assert event names, ordered sequences, and nested payload fields (for example UUIDs) without this library knowing your domain types.

### Two building blocks

| Layer | What it is | When to use |
|-------|------------|-------------|
| **Helpers** (`waitForMessage`, `waitForEventName`, `waitForMessageSequence`, `collectMessages`, `getByPath`) | Promise/async utilities on an existing message stream | Any test that can obtain an `Observable<GlobalBusMessage>` |
| **`PubSubGlobalBusListener`** | Opens Pub/Sub (or the emulator) with a **dedicated** `subscriptionName` and exposes `messages$` | App runs **out of process** (typical Playwright + API against `localhost`, or a second service). Use a **unique** subscription per run (for example `e2e-${crypto.randomUUID()}`) so tests do not steal messages from each other. Call **`close()`** when done. |

### Configuration (align with your app)

Use the same **`projectId`**, **`topicName`**, and emulator **`apiEndpoint` / `port`** as `PubSubCqrsModule.forRoot` (or your env-based factory). For `PubSubGlobalBusListener`, **`subscriptionName` must be different** from every running service subscription so the test consumer does not compete with production-style subscribers on the same subscription.

Example environment alignment for local emulator:

```bash
PUBSUB_PROJECT_ID=integration-test-project
PUBSUB_TOPIC=integration-events-topic
# App subscription (example)
PUBSUB_SUBSCRIPTION=users-service-sub
# E2E listener: pick a unique name in test code, not necessarily in .env
```

### In-process (Nest `TestingModule`)

`PubSubService.read$()` is backed by a **multicast** stream: your test can subscribe in parallel with `PubSubCqrsModule` without extra setup.

```typescript
import { getByPath, PubSubService, waitForEventName } from "nestjs-google-pubsub-cqrs";

const pubSub = app.get(PubSubService);
const eventPromise = waitForEventName(
  pubSub.read$(),
  "UserCreatedEvent",
  { timeoutMs: 15000 }
);
// trigger your handler (HTTP call, command, etc.)
const msg = await eventPromise;
const userId = getByPath(msg.eventBody, "payload.userId");
```

### Separate process / Playwright (Node side only)

Start **`PubSubGlobalBusListener`** in the **Node** process (fixture, `test.beforeAll`, or `globalSetup`), **not** inside `page.evaluate` or other browser code. The Google Pub/Sub client runs only in Node.

```typescript
import {
  PubSubGlobalBusListener,
  waitForMessage,
} from "nestjs-google-pubsub-cqrs";
import { randomUUID } from "crypto";

const listener = new PubSubGlobalBusListener();
await listener.connect({
  subscriptionName: `e2e-${randomUUID()}`,
  topicName: process.env.PUBSUB_TOPIC!,
  projectId: process.env.PUBSUB_PROJECT_ID!,
  apiEndpoint: "localhost",
  port: 8085,
});

const match = waitForMessage(
  listener.messages$,
  (m) => m.eventName === "OrderPaidEvent",
  { timeoutMs: 30000 }
);
// drive the app via Playwright / HTTP, then:
const msg = await match;
await listener.close();
```

### API surface (testing)

Exported next to the core module: **`waitForMessage`**, **`waitForEventName`**, **`waitForMessageSequence`**, **`collectMessages`**, **`getByPath`**, **`PubSubGlobalBusListener`**, and option types such as **`WaitForBusMessageOptions`**.

## 🚨 Troubleshooting

### Common Issues

**1. Authentication Error**

```
Error: Could not load the default credentials
```

**Solution**: Configure Google Cloud authentication:

```bash
gcloud auth application-default login
# OR
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
```

**2. Topic/Subscription Not Found**

```
Error: Topic was not found
```

**Solution**: Create the topic and subscription in Google Cloud Console or using gcloud CLI:

```bash
gcloud pubsub topics create my-events-topic
gcloud pubsub subscriptions create my-service-subscription --topic=my-events-topic
```

**3. Events Not Being Received**
**Solution**: Ensure all services use the same topic name and different subscription names.

### Debug Mode

Enable debug logging to troubleshoot connection issues:

```typescript
import { Logger } from "@nestjs/common";

// The module automatically logs connection status
// Check your application logs for messages like:
// "Global Bus connection established - my-service-subscription"
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
git clone https://github.com/your-username/nestjs-google-pubsub-cqrs.git
cd nestjs-google-pubsub-cqrs
npm install
npm run build
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the NestJS community
- Powered by Google Cloud Pub/Sub
- Inspired by event-driven architecture patterns

---

**Made with ❤️ for the NestJS community**
