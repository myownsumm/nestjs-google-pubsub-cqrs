# Publishing to Docker Hub

This guide explains how to build and publish the NestJS Google Pub/Sub Emulator to Docker Hub.

## Prerequisites

1. Docker Hub account
2. Docker installed locally
3. Docker CLI logged in to Docker Hub

## Manual Publishing

### 1. Set Up Multi-Platform Builder

```bash
cd docker-image

# Create and use a multi-platform builder (only needed once)
docker buildx create --name multiarch --use --driver docker-container

# Verify builder supports multiple platforms
docker buildx inspect --bootstrap
```

### 2. Build and Push Multi-Platform Image

```bash
# Build for multiple platforms and push directly to Docker Hub
# Note: --push flag is required for multi-platform builds
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myownsumm/nestjs-google-pubsub-emulator:latest \
  --push .

# For versioned releases, add version tags
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myownsumm/nestjs-google-pubsub-emulator:latest \
  -t myownsumm/nestjs-google-pubsub-emulator:1.0.0 \
  --push .
```

### 3. Verify Multi-Platform Support

```bash
# Check that both platforms are available
docker buildx imagetools inspect myownsumm/nestjs-google-pubsub-emulator:latest

# Test AMD64 version (for CI compatibility)
docker run --rm --platform=linux/amd64 -p 8086:8090 \
  -e PUBSUB_PROJECT_ID=test-project \
  myownsumm/nestjs-google-pubsub-emulator:latest &

# Test ARM64 version (for local development)
docker run --rm --platform=linux/arm64 -p 8087:8090 \
  -e PUBSUB_PROJECT_ID=test-project \
  myownsumm/nestjs-google-pubsub-emulator:latest &
```

### ⚠️ Important Notes

- **Always use `--push` flag**: Multi-platform builds cannot be loaded locally and must be pushed directly
- **Platform support is critical**: CI environments (GitHub Actions) use AMD64, while Apple Silicon Macs use ARM64
- **Don't use `docker tag` and `docker push`**: These commands don't work with multi-platform manifests

## Automated Publishing with GitHub Actions

### 1. Set up GitHub Secrets

Add these secrets to your GitHub repository:

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token

### 2. Create GitHub Workflow

Create `.github/workflows/docker-publish.yml` in your repository root:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches:
      - main
    paths:
      - 'docker-image/**'
  release:
    types: [published]
  workflow_dispatch:

env:
  DOCKER_IMAGE: nestjs-google-pubsub-emulator

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: myownsumm/${{ env.DOCKER_IMAGE }}
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./docker-image
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        platforms: linux/amd64,linux/arm64

    - name: Update Docker Hub description
      uses: peter-evans/dockerhub-description@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
        repository: myownsumm/${{ env.DOCKER_IMAGE }}
        readme-filepath: ./docker-image/README.md
```

## Testing the Published Image

After publishing, test the image on both platforms:

```bash
# Test AMD64 version (for CI environments like GitHub Actions)
docker run --rm --platform=linux/amd64 -p 8085:8090 \
  -e PUBSUB_PROJECT_ID=integration-test-project \
  -e PUBSUB_TOPIC=integration-events-topic \
  -e PUBSUB_SUBSCRIPTION=event-bus-monitoring-sub \
  myownsumm/nestjs-google-pubsub-emulator:latest &

# Test ARM64 version (for Apple Silicon Macs)
docker run --rm --platform=linux/arm64 -p 8086:8090 \
  -e PUBSUB_PROJECT_ID=integration-test-project \
  -e PUBSUB_TOPIC=integration-events-topic \
  -e PUBSUB_SUBSCRIPTION=event-bus-monitoring-sub \
  myownsumm/nestjs-google-pubsub-emulator:latest &

# Wait for containers to start
sleep 5

# Test connectivity
nc -z localhost 8085 && echo "✅ AMD64 version is responding"
nc -z localhost 8086 && echo "✅ ARM64 version is responding"

# Clean up
docker stop $(docker ps -q --filter ancestor=myownsumm/nestjs-google-pubsub-emulator:latest)
```

## Docker Hub Repository Setup

### Repository Description
```
A production-ready Google Pub/Sub emulator for NestJS CQRS development. Supports both AMD64 and ARM64 architectures for CI/CD and local development.
```

### Tags and Versions

- `latest`: Latest stable version (multi-platform)
- `1.0.0`, `1.0`, `1`: Semantic versioning (multi-platform)
- `main`: Latest from main branch (multi-platform)

### Repository Keywords
```
pubsub, emulator, nestjs, cqrs, google-cloud, development, testing, multi-platform, amd64, arm64
```

## Usage Examples for Users

### Basic Usage

```bash
# Simple usage (Docker will auto-select the correct platform)
docker run -d -p 8085:8090 myownsumm/nestjs-google-pubsub-emulator:latest

# Explicit platform selection for CI environments
docker run -d --platform=linux/amd64 -p 8085:8090 \
  myownsumm/nestjs-google-pubsub-emulator:latest

# With custom configuration
docker run -d --platform=linux/amd64 -p 8085:8090 \
  -e PUBSUB_PROJECT_ID=my-project \
  -e PUBSUB_TOPIC=my-events \
  -e PUBSUB_SUBSCRIPTION=my-events-sub \
  myownsumm/nestjs-google-pubsub-emulator:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  pubsub-emulator:
    image: myownsumm/nestjs-google-pubsub-emulator:latest
    platform: linux/amd64  # Specify platform for consistency
    ports:
      - "8085:8090"
    environment:
      - PUBSUB_PROJECT_ID=integration-test-project
      - PUBSUB_TOPIC=integration-events-topic
      - PUBSUB_SUBSCRIPTION=event-bus-monitoring-sub
    healthcheck:
      test: ["CMD", "sh", "-c", "netstat -tulpen | grep 0.0.0.0:8090"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### CI/CD Integration (GitHub Actions)

```yaml
- name: Start Pub/Sub emulator
  run: |
    docker run -d --rm --platform=linux/amd64 -p 8085:8090 \
      -e PUBSUB_PROJECT_ID=integration-test-project \
      -e PUBSUB_EMULATOR_PORT=8090 \
      -e PUBSUB_TOPIC=integration-events-topic \
      -e PUBSUB_SUBSCRIPTION=event-bus-monitoring-sub \
      --name pubsub-emulator \
      myownsumm/nestjs-google-pubsub-emulator:latest
```

## Maintenance

### Updating the Image

1. Make changes to the Docker image files
2. Update version in `package.json` and `Dockerfile` labels
3. Test locally on both platforms
4. Commit and push changes
5. Create a new release on GitHub (triggers automated multi-platform build)
6. Verify both AMD64 and ARM64 versions work correctly

### Monitoring

- Check GitHub Actions for build status
- Monitor Docker Hub for pull statistics across platforms
- Verify multi-platform manifest is created correctly
- Review user feedback and platform-specific issues

### Troubleshooting

**Platform Mismatch Issues:**
```bash
# Check available platforms
docker buildx imagetools inspect myownsumm/nestjs-google-pubsub-emulator:latest

# Force specific platform if auto-detection fails
docker run --platform=linux/amd64 myownsumm/nestjs-google-pubsub-emulator:latest
```