#!/bin/bash

# Trigger UserLicenseUpgradeEvent via users-service for 100 different users
curl -X POST http://localhost:3000/users/update-license \
  -H "Content-Type: application/json" 