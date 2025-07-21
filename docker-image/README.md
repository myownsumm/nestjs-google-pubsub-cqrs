# NestJS Google Pub/Sub Emulator

A simple Google Pub/Sub emulator for local development with the `nestjs-google-pubsub-cqrs` library.

## Quick Start

### Option 1: Simple Docker Run
```bash
# Pull and run the emulator
docker run -d \
  --name nestjs-pubsub-emulator \
  -p 8090:8090 \
  your-dockerhub-username/nestjs-google-pubsub-emulator

# Check if it's running
docker logs nestjs-pubsub-emulator
```

### Option 2: Using Start Script
```bash
# Copy env.example to .env and modify
cp env.example .env

# Start with configuration
./start.sh
```

### Option 3: Using Docker Compose
```bash
# Copy env.example to .env and modify
cp env.example .env

# Start with docker-compose
docker-compose up -d
```

## Features

- 🚀 **Ready-to-use**: No configuration files needed
- 📦 **Lightweight**: Optimized Alpine-based image
- 🔒 **Secure**: Runs as non-root user
- 🎯 **NestJS Integration**: Perfect for CQRS event bus development
- 📝 **Message Monitoring**: Logs all messages for debugging

## Configuration

### Environment Variables

You can configure the emulator using environment variables:

```bash
docker run -d \
  -p 8090:8090 \
  -e PUBSUB_PROJECT_ID=my-project \
  -e PUBSUB_EMULATOR_PORT=8090 \
  -e PUBSUB_TOPIC=my-events \
  -e PUBSUB_SUBSCRIPTION=my-events-sub \
  your-dockerhub-username/nestjs-google-pubsub-emulator
```

### Using .env File

Create a `.env` file for persistent configuration:

```bash
# Copy the example
cp env.example .env

# Edit .env file
PUBSUB_PROJECT_ID=my-project
PUBSUB_EMULATOR_PORT=8080
PUBSUB_TOPIC=my-events
PUBSUB_SUBSCRIPTION=my-events-sub
```

The start script and docker-compose will automatically load these variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBSUB_PROJECT_ID` | `integration-test-project` | Google Cloud project ID |
| `PUBSUB_EMULATOR_PORT` | `8090` | Pub/Sub emulator port (user configurable) |
| `PUBSUB_TOPIC` | `integration-events-topic` | Default topic to create |
| `PUBSUB_SUBSCRIPTION` | `event-bus-monitoring-sub` | Default subscription to create |

## Usage with NestJS

Configure your NestJS application to use the emulator:

```typescript
import { Module } from '@nestjs/common';
import { PubSubCqrsModule } from 'nestjs-google-pubsub-cqrs';

@Module({
  imports: [
    PubSubCqrsModule.forRoot({
      subscriptionName: 'event-bus-monitoring-sub',
      topicName: 'integration-events-topic',
      projectId: 'integration-test-project',
      apiEndpoint: 'localhost',
      port: 8090
    })
  ],
})
export class AppModule {}
```

## Docker Compose Example

```yaml
version: '3.8'
services:
  pubsub-emulator:
    image: your-dockerhub-username/nestjs-google-pubsub-emulator
    ports:
      - "8090:8090"
    environment:
      - PUBSUB_PROJECT_ID=integration-test-project
      - PUBSUB_TOPIC=integration-events-topic
    healthcheck:
      test: ["CMD", "sh", "-c", "netstat -tulpen | grep 0.0.0.0:8090"]
      interval: 10s
      timeout: 5s
      retries: 3

  your-app:
    build: .
    depends_on:
      - pubsub-emulator
    environment:
      - PUBSUB_EMULATOR_HOST=pubsub-emulator:8090
```

## Ports

- **8090**: Google Pub/Sub emulator endpoint (configurable via `PUBSUB_EMULATOR_PORT`)

## Monitoring

The emulator logs all messages for debugging:

```bash
# View logs
docker logs -f nestjs-pubsub-emulator

# Check container health
docker ps
```

You'll see output like:
```
Topic projects/integration-test-project/topics/integration-events-topic created.
Subscription event-bus-monitoring-sub created.
```

## Development

This emulator is specifically designed for the [`nestjs-google-pubsub-cqrs`](https://github.com/myownsumm/nestjs-google-pubsub-cqrs) library but works with any Google Pub/Sub client.

## License

MIT License - see the [nestjs-google-pubsub-cqrs](https://github.com/myownsumm/nestjs-google-pubsub-cqrs) repository for details. 