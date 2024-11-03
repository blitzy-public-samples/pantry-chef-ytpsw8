#!/bin/bash

# HUMAN TASKS:
# 1. Ensure MongoDB is installed and accessible for test database cleanup
# 2. Ensure Redis is installed and accessible for test cache cleanup
# 3. Configure test environment variables in .env.test file
# 4. Set up test coverage thresholds in package.json
# 5. Create test database with appropriate permissions

# Exit on any error
set -e

# Requirement: Backend Testing Infrastructure - Set test environment
export NODE_ENV=test

# Function to run tests with coverage reporting
# Requirement: CI/CD Pipeline - Automated test execution with 100% coverage requirement
run_tests() {
    local test_type=$1
    local coverage_threshold=100
    local exit_code=0

    echo "Running ${test_type} tests..."

    # Clear Jest cache to ensure clean test runs
    npx jest --clearCache

    case $test_type in
        "unit")
            # Run unit tests with coverage
            npx jest --coverage --verbose --testMatch "**/tests/unit/**/*.test.ts" --runInBand
            ;;
        "integration")
            # Run integration tests with coverage
            npx jest --coverage --verbose --testMatch "**/tests/integration/**/*.test.ts" --runInBand
            ;;
        "e2e")
            # Run end-to-end tests with coverage
            npx jest --coverage --verbose --testMatch "**/tests/e2e/**/*.test.ts" --runInBand
            ;;
        "all")
            # Run all tests with coverage
            npx jest --coverage --verbose --runInBand
            ;;
        *)
            echo "Invalid test type. Use: unit, integration, e2e, or all"
            exit 1
            ;;
    esac

    exit_code=$?

    # Check if tests passed and coverage meets threshold
    if [ $exit_code -eq 0 ]; then
        # Extract coverage percentage from coverage/coverage-summary.json
        local coverage=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*,"skipped":[0-9]*,"pct":[0-9]*\.*[0-9]*}' | grep -o 'pct":[0-9]*\.*[0-9]*' | cut -d':' -f2)
        
        if (( $(echo "$coverage < $coverage_threshold" | bc -l) )); then
            echo "Coverage ($coverage%) is below threshold ($coverage_threshold%)"
            exit 1
        else
            echo "Coverage requirements met ($coverage%)"
        fi
    fi

    return $exit_code
}

# Function to clean up test artifacts and environment
cleanup() {
    echo "Cleaning up test environment..."

    # Remove temporary test files
    rm -rf /tmp/test-*

    # Clear test MongoDB database if it exists
    if command -v mongo &> /dev/null; then
        mongo test --eval "db.dropDatabase()" &> /dev/null || true
    fi

    # Clear test Redis cache if it exists
    if command -v redis-cli &> /dev/null; then
        redis-cli -n 1 FLUSHDB &> /dev/null || true
    fi

    # Remove coverage reports from previous runs
    rm -rf coverage/

    # Reset test environment variables
    unset NODE_ENV
    unset JEST_WORKER_ID
}

# Set up error handling
trap cleanup EXIT

# Main execution
if [ $# -eq 0 ]; then
    # Default to running all tests if no argument provided
    test_type="all"
else
    test_type=$1
fi

# Run tests and store exit code
run_tests $test_type
exit_code=$?

# Exit with test result
exit $exit_code