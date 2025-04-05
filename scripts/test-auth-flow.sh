#!/bin/bash

# Run the unit tests for the auth controller
echo "Running auth controller unit tests..."
NODE_OPTIONS="--experimental-vm-modules" npx jest libs/auth/src/adapters/nest/controllers/auth.controller.spec.ts --verbose

# Run the integration tests
echo "Running auth integration tests..."
NODE_OPTIONS="--experimental-vm-modules" npx jest apps/nest-test/src/app/auth/auth.integration.spec.ts --verbose --runInBand

echo "Tests completed!"
