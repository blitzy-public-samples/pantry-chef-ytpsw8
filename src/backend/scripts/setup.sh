#!/bin/bash

# PantryChef Backend Development Environment Setup Script
# Requirements addressed:
# - Development Environment Setup (7.6)
# - Security Configuration (5.6)
# - Database Configuration (7.3)

# Exit on any error
set -e

# Global variables
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
MIN_NODE_VERSION="16.0.0"
MIN_NPM_VERSION="8.0.0"
REQUIRED_PORTS=(27017 6379 9200 5672)
REQUIRED_DISK_SPACE=1024 # MB

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_compare() {
    echo "$1" "$2" | awk '{
        split($1, a, ".");
        split($2, b, ".");
        for (i = 1; i <= 3; i++) {
            if (a[i] < b[i]) exit 1;
            if (a[i] > b[i]) exit 0;
        }
        exit 0;
    }'
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."

    # Check Node.js version
    if ! command_exists node; then
        echo "❌ Node.js is not installed. Please install Node.js $MIN_NODE_VERSION or higher."
        exit 1
    fi
    NODE_VERSION=$(node -v | cut -d 'v' -f 2)
    if ! version_compare "$NODE_VERSION" "$MIN_NODE_VERSION"; then
        echo "❌ Node.js version $NODE_VERSION is below minimum required version $MIN_NODE_VERSION"
        exit 1
    fi

    # Check npm version
    if ! command_exists npm; then
        echo "❌ npm is not installed. Please install npm $MIN_NPM_VERSION or higher."
        exit 1
    fi
    NPM_VERSION=$(npm -v)
    if ! version_compare "$NPM_VERSION" "$MIN_NPM_VERSION"; then
        echo "❌ npm version $NPM_VERSION is below minimum required version $MIN_NPM_VERSION"
        exit 1
    fi

    # Check Docker
    if ! command_exists docker; then
        echo "❌ Docker is not installed. Please install Docker."
        exit 1
    fi

    # Check available disk space
    AVAILABLE_SPACE=$(df -m . | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_DISK_SPACE" ]; then
        echo "❌ Insufficient disk space. Required: ${REQUIRED_DISK_SPACE}MB, Available: ${AVAILABLE_SPACE}MB"
        exit 1
    fi

    # Check port availability
    for PORT in "${REQUIRED_PORTS[@]}"; do
        if lsof -i :"$PORT" >/dev/null 2>&1; then
            echo "❌ Port $PORT is already in use"
            exit 1
        fi
    done

    echo "✅ All prerequisites checked successfully"
    return 0
}

# Function to setup environment
setup_environment() {
    echo "🔧 Setting up environment..."

    # Copy environment file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        
        # Generate random JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s/your_jwt_secret_here/$JWT_SECRET/" "$PROJECT_ROOT/.env"

        # Set development environment
        sed -i.bak "s/NODE_ENV=.*/NODE_ENV=development/" "$PROJECT_ROOT/.env"

        # Configure local service connections
        sed -i.bak "s#mongodb://.*#mongodb://localhost:27017/pantrychef#" "$PROJECT_ROOT/.env"
        sed -i.bak "s/REDIS_HOST=.*/REDIS_HOST=localhost/" "$PROJECT_ROOT/.env"
        sed -i.bak "s/ELASTICSEARCH_NODE=.*/ELASTICSEARCH_NODE=http:\/\/localhost:9200/" "$PROJECT_ROOT/.env"
        sed -i.bak "s#RABBITMQ_URL=.*#RABBITMQ_URL=amqp://localhost:5672#" "$PROJECT_ROOT/.env"

        # Clean up backup files
        rm -f "$PROJECT_ROOT/.env.bak"
    fi

    echo "✅ Environment setup completed"
    return 0
}

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."

    # Install global packages
    npm install -g typescript@4.9.5
    npm install -g nodemon@2.0.20
    npm install -g jest@29.4.0

    # Install project dependencies
    cd "$PROJECT_ROOT"
    npm install

    # Build TypeScript project
    npm run build

    echo "✅ Dependencies installed successfully"
    return 0
}

# Function to setup local services
setup_local_services() {
    echo "🐳 Setting up local services..."

    # Pull required Docker images
    docker pull mongo:latest
    docker pull redis:latest
    docker pull elasticsearch:8.6.0
    docker pull rabbitmq:3-management

    # Start MongoDB
    docker run -d --name pantrychef-mongodb \
        -p 27017:27017 \
        -e MONGO_INITDB_DATABASE=pantrychef \
        mongo:latest

    # Start Redis
    docker run -d --name pantrychef-redis \
        -p 6379:6379 \
        redis:latest

    # Start Elasticsearch
    docker run -d --name pantrychef-elasticsearch \
        -p 9200:9200 -p 9300:9300 \
        -e "discovery.type=single-node" \
        -e "xpack.security.enabled=false" \
        elasticsearch:8.6.0

    # Start RabbitMQ
    docker run -d --name pantrychef-rabbitmq \
        -p 5672:5672 -p 15672:15672 \
        rabbitmq:3-management

    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 30

    echo "✅ Local services started successfully"
    return 0
}

# Function to initialize database
initialize_database() {
    echo "🗄️ Initializing database..."

    # Wait for MongoDB to be ready
    until docker exec pantrychef-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
        echo "Waiting for MongoDB connection..."
        sleep 2
    done

    # Create database indexes
    docker exec pantrychef-mongodb mongosh --eval '
        use pantrychef;
        db.users.createIndex({ "email": 1 }, { unique: true });
        db.recipes.createIndex({ "name": "text", "tags": 1 });
        db.pantries.createIndex({ "userId": 1 });
        db.pantryItems.createIndex({ "pantryId": 1, "expirationDate": 1 });
    '

    # Initialize Elasticsearch mappings
    curl -X PUT "localhost:9200/recipes" -H 'Content-Type: application/json' -d'
    {
        "mappings": {
            "properties": {
                "name": { "type": "text" },
                "ingredients": { "type": "text" },
                "tags": { "type": "keyword" }
            }
        }
    }'

    # Setup RabbitMQ exchanges and queues
    docker exec pantrychef-rabbitmq rabbitmqctl add_vhost pantrychef
    docker exec pantrychef-rabbitmq rabbitmqctl set_permissions -p pantrychef guest ".*" ".*" ".*"

    echo "✅ Database initialization completed"
    return 0
}

# Main execution
echo "🚀 Starting PantryChef backend setup..."

check_prerequisites
setup_environment
install_dependencies
setup_local_services
initialize_database

echo "✨ PantryChef backend setup completed successfully!"
echo "
Next steps:
1. Review the .env file and update any necessary configurations
2. Start the development server with: npm run dev
3. Access the services at:
   - API: http://localhost:3000
   - MongoDB: mongodb://localhost:27017
   - Redis: localhost:6379
   - Elasticsearch: http://localhost:9200
   - RabbitMQ Management: http://localhost:15672 (guest/guest)
"