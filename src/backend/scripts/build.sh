#!/bin/bash

# HUMAN TASKS:
# 1. Ensure Node.js version 16.0.0 or higher is installed
# 2. Set up environment variables in .env file
# 3. Configure AWS credentials if using S3 for storage
# 4. Set up MongoDB connection string in environment
# 5. Configure Redis connection details if caching is enabled

# Enable strict error handling
set -e

# Global variables
BUILD_DIR="./dist"
MIN_NODE_VERSION="16.0.0"
REQUIRED_DIRS=("dist/api" "dist/config" "dist/interfaces" "dist/models" "dist/services" "dist/utils" "dist/workers" "dist/websocket")

# Requirement: Development Environment Setup - Check Node.js version
check_node_version() {
    echo "Checking Node.js version..."
    local current_version=$(node --version | cut -d 'v' -f 2)
    if [ "$(printf '%s\n' "$MIN_NODE_VERSION" "$current_version" | sort -V | head -n1)" != "$MIN_NODE_VERSION" ]; then
        echo "Error: Node.js version must be $MIN_NODE_VERSION or higher (current: $current_version)"
        exit 1
    }
    echo "Node.js version check passed: $current_version"
}

# Requirement: Backend Build Process - Clean build directory
clean_dist() {
    echo "Cleaning dist directory..."
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi
    
    echo "Creating required directories..."
    for dir in "${REQUIRED_DIRS[@]}"; do
        mkdir -p "$dir"
    done
    
    if [ ! -d "$BUILD_DIR" ]; then
        echo "Error: Failed to create build directory"
        exit 1
    }
    echo "Build directory cleaned and prepared"
}

# Requirement: Development Environment Setup - Install dependencies
install_dependencies() {
    echo "Installing dependencies..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies with npm ci..."
        npm ci
    else
        # Check if package-lock.json is newer than node_modules
        if [ "package-lock.json" -nt "node_modules" ]; then
            echo "Updating dependencies with npm ci..."
            npm ci
        fi
    fi
    
    # Install devDependencies if in development environment
    if [ "$NODE_ENV" = "development" ]; then
        echo "Installing devDependencies for development environment..."
        npm install --only=dev
    fi
    
    # Verify core dependencies are installed
    if [ ! -d "node_modules/typescript" ] || [ ! -d "node_modules/@types/node" ]; then
        echo "Error: Core dependencies are missing"
        exit 1
    }
    echo "Dependencies installation completed"
}

# Requirement: Backend Build Process - Build TypeScript files
build_typescript() {
    echo "Building TypeScript files..."
    
    # Run TypeScript compiler
    ./node_modules/.bin/tsc --project tsconfig.json
    
    if [ $? -ne 0 ]; then
        echo "Error: TypeScript compilation failed"
        exit 1
    }
    
    # Check if source maps are enabled in tsconfig.json and verify their generation
    if grep -q '"sourceMap": true' tsconfig.json; then
        if ! find "$BUILD_DIR" -name "*.js.map" -type f -print -quit | grep -q .; then
            echo "Error: Source maps were not generated"
            exit 1
        fi
    fi
    
    echo "TypeScript compilation completed"
}

# Requirement: Backend Build Process - Validate build output
validate_build() {
    echo "Validating build output..."
    
    # Check if main server file exists
    if [ ! -f "$BUILD_DIR/server.js" ]; then
        echo "Error: Main server.js file is missing from build output"
        exit 1
    }
    
    # Verify all required directories exist
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            echo "Error: Required directory $dir is missing"
            exit 1
        fi
    done
    
    # Check file permissions
    if ! find "$BUILD_DIR" -type f -name "*.js" -perm -u=r -print -quit | grep -q .; then
        echo "Error: Built files have incorrect permissions"
        exit 1
    }
    
    echo "Build validation completed successfully"
}

# Main build process
main() {
    echo "Starting PantryChef backend build process..."
    
    check_node_version
    clean_dist
    install_dependencies
    build_typescript
    validate_build
    
    echo "Build process completed successfully!"
    exit 0
}

# Execute main function
main