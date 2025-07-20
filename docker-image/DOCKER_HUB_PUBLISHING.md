# Publishing to Docker Hub

This guide explains how to build and publish the NestJS Google Pub/Sub Emulator to Docker Hub.

## Prerequisites

1. Docker Hub account
2. Docker installed locally
3. Docker CLI logged in to Docker Hub

## Manual Publishing

### 1. Build the Image

```bash
cd docker-image

# Build for multiple platforms
docker buildx create --name multiarch --use
docker buildx build --platform linux/amd64,linux/arm64 -t your-dockerhub-username/nestjs-google-pubsub-emulator:latest .
```

### 2. Tag the Image

```bash
# Tag with version
docker tag your-dockerhub-username/nestjs-google-pubsub-emulator:latest your-dockerhub-username/nestjs-google-pubsub-emulator:1.0.0

# Tag as latest
docker tag your-dockerhub-username/nestjs-google-pubsub-emulator:latest your-dockerhub-username/nestjs-google-pubsub-emulator:latest
```

### 3. Push to Docker Hub

```bash
# Push specific version
docker push your-dockerhub-username/nestjs-google-pubsub-emulator:1.0.0

# Push latest
docker push your-dockerhub-username/nestjs-google-pubsub-emulator:latest
```

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
        images: ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}
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
        repository: ${{ secrets.DOCKER_USERNAME }}/${{ env.DOCKER_IMAGE }}
        readme-filepath: ./docker-image/README.md
```

## Testing the Published Image

After publishing, test the image:

```bash
# Pull and run
docker run -d --name test-emulator -p 8085:8085 -p 3000:3000 your-dockerhub-username/nestjs-google-pubsub-emulator:latest

# Test health endpoint
curl http://localhost:3000/health

# Test info endpoint
curl http://localhost:3000/info

# Clean up
docker stop test-emulator && docker rm test-emulator
```

## Docker Hub Repository Setup

### Repository Description
```
A production-ready Google Pub/Sub emulator with HTTP API for local NestJS CQRS development
```

### Tags and Versions

- `latest`: Latest stable version
- `1.0.0`, `1.0`, `1`: Semantic versioning
- `main`: Latest from main branch

### Repository Keywords
```
pubsub, emulator, nestjs, cqrs, google-cloud, development, testing
```

## Usage Examples for Users

Once published, users can use it like this:

```bash
# Simple usage
docker run -d -p 8085:8085 -p 3000:3000 your-dockerhub-username/nestjs-google-pubsub-emulator

# With custom configuration
docker run -d \
  -p 8085:8085 \
  -p 3000:3000 \
  -e PUBSUB_PROJECT_ID=my-project \
  -e PUBSUB_DEFAULT_TOPICS=events,notifications \
  your-dockerhub-username/nestjs-google-pubsub-emulator

# With docker-compose
version: '3.8'
services:
  pubsub:
    image: your-dockerhub-username/nestjs-google-pubsub-emulator
    ports:
      - "8085:8085"
      - "3000:3000"
```

## Maintenance

### Updating the Image

1. Make changes to the Docker image files
2. Update version in `package.json` and `Dockerfile` labels
3. Commit and push changes
4. Create a new release on GitHub (triggers automated build)
5. Update Docker Hub repository description if needed

### Monitoring

- Check GitHub Actions for build status
- Monitor Docker Hub for pull statistics
- Review user feedback and issues 