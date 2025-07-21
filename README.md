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
}
```

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
