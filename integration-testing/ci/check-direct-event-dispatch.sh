#!/bin/bash

# Trigger UserCreatedEvent via users-service
curl -X POST http://localhost:3000/users/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","email":"test@example.com"}' 