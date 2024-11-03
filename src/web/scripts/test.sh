#!/bin/bash
set -e -o pipefail

# HUMAN TASKS:
# 1. Ensure Node.js 16+ is installed
# 2. Run 'npm install' to install all dependencies before running tests
# 3. Configure CI environment variable if running in CI/CD pipeline
# 4. Ensure sufficient disk space for coverage reports (minimum 1GB recommended)

# Function to clean up previous test reports
cleanup_reports() {
    echo "Cleaning up previous test reports..."
    rm -rf ./coverage
    rm -f ./test-report.xml
    rm -f ./coverage/junit/junit.xml
    mkdir -p ./coverage/junit
}

# Function to run tests with coverage and generate reports
run_tests() {
    local exit_code=0

    echo "Starting test suite execution..."
    
    # Set test environment
    export NODE_ENV=test
    
    # Run Jest with coverage reporting
    if [ "$CI" = "true" ]; then
        # CI environment: Generate JUnit reports and enforce coverage
        echo "CI environment detected - generating detailed reports..."
        npx jest \
            --ci \
            --colors \
            --coverage \
            --coverageReporters="text" \
            --coverageReporters="lcov" \
            --coverageReporters="json-summary" \
            --coverageDirectory="./coverage" \
            --reporters="default" \
            --reporters="jest-junit" \
            --testLocationInResults \
            --runInBand \
            --verbose || exit_code=$?
    else
        # Local environment: Standard coverage reporting
        echo "Running tests in local environment..."
        npx jest \
            --coverage \
            --colors \
            --verbose || exit_code=$?
    fi

    # Display coverage summary
    if [ -f "./coverage/coverage-summary.json" ]; then
        echo "Coverage Summary:"
        cat ./coverage/coverage-summary.json | jq '.total'
    fi

    # Check exit code and provide appropriate message
    if [ $exit_code -eq 0 ]; then
        echo "✅ All tests passed successfully with required coverage!"
    else
        echo "❌ Tests failed or coverage requirements not met."
        echo "Please check the test output above for details."
    fi

    return $exit_code
}

# Set up environment variables
export NODE_ENV=test
export CI=${CI:-false}
export JEST_JUNIT_OUTPUT_DIR=./coverage/junit
export JEST_JUNIT_OUTPUT_NAME=junit.xml

# Trap cleanup function
trap cleanup_reports EXIT

# Execute test sequence
cleanup_reports
run_tests

# Exit with test result
exit $?