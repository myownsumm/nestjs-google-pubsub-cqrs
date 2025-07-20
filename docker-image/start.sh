#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
PUBSUB_PROJECT_ID=${PUBSUB_PROJECT_ID:-integration-test-project}
PUBSUB_EMULATOR_PORT=${PUBSUB_EMULATOR_PORT:-8090}
PUBSUB_TOPIC=${PUBSUB_TOPIC:-integration-events-topic}
PUBSUB_SUBSCRIPTION=${PUBSUB_SUBSCRIPTION:-event-bus-monitoring-sub}

echo "🚀 Starting NestJS Google Pub/Sub Emulator"
echo "   Project ID: $PUBSUB_PROJECT_ID"
echo "   Port: $PUBSUB_EMULATOR_PORT"
echo "   Topic: $PUBSUB_TOPIC"
echo "   Subscription: $PUBSUB_SUBSCRIPTION"

# Check if using docker-compose
if [ -f docker-compose.yml ]; then
    echo "📦 Using docker-compose..."
    docker-compose up -d
else
    echo "🐳 Using docker run..."
    docker run -d \
        --name nestjs-pubsub-emulator \
        -p $PUBSUB_EMULATOR_PORT:$PUBSUB_EMULATOR_PORT \
        -e PUBSUB_PROJECT_ID=$PUBSUB_PROJECT_ID \
        -e PUBSUB_EMULATOR_PORT=$PUBSUB_EMULATOR_PORT \
        -e PUBSUB_TOPIC=$PUBSUB_TOPIC \
        -e PUBSUB_SUBSCRIPTION=$PUBSUB_SUBSCRIPTION \
        your-dockerhub-username/nestjs-google-pubsub-emulator
fi

echo "✅ Emulator started! Check logs with: docker logs nestjs-pubsub-emulator" 