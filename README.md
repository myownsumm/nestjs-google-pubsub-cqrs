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
npm install nestjs-google-pubsub-cqrs @google-cloud/pubsub
```

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

## 🔧 Local Development

Local development workaround to be added soon.

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
