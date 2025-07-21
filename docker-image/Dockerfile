# Multi-stage build for Google Pub/Sub Emulator
FROM gcr.io/google.com/cloudsdktool/google-cloud-cli:alpine AS builder

# Install Pub/Sub emulator
RUN gcloud components install pubsub-emulator

# Production image
FROM node:18-alpine

# Metadata for Docker Hub
LABEL maintainer="Oleksandr Poltoratskyi"
LABEL description="Google Pub/Sub Emulator for NestJS CQRS development"
LABEL version="1.0.0"

# Copy Pub/Sub emulator from builder
COPY --from=builder /google-cloud-sdk/platform/pubsub-emulator /pubsub-emulator

# Install system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
        ca-certificates \
        tini \
        bash \
        coreutils \
        openjdk11 \
        tzdata \
        curl \
        netcat-openbsd && \
    update-ca-certificates && \
    rm -rf /var/cache/apk/* && \
    addgroup -g 1001 -S pubsub && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G pubsub -g pubsub pubsub

# Set working directory
WORKDIR /app

# Copy application files
COPY server.js ./

# Install Node.js dependencies
RUN npm install @google-cloud/pubsub@^4.0.2 --only=production && \
    npm cache clean --force

# Set default environment variables (same as unov-gcloud)
ENV PUBSUB_PROJECT_ID=integration-test-project \
    PUBSUB_EMULATOR_PORT=8090 \
    PUBSUB_TOPIC=integration-events-topic \
    PUBSUB_SUBSCRIPTION=event-bus-monitoring-sub

# Create data directory and set permissions
RUN mkdir -p /app/data && \
    chown -R pubsub:pubsub /app

# Switch to non-root user
USER pubsub

# Expose emulator port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=10s --start-period=30s --timeout=5s --retries=3 \
    CMD netstat -tulpen | grep 0.0.0.0:${PUBSUB_EMULATOR_PORT} || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"] 