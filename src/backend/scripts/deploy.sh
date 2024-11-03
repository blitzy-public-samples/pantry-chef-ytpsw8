#!/bin/bash

# Human Tasks:
# 1. Configure AWS CLI with appropriate credentials and permissions (ECS:*, ECR:*, IAM:GetRole)
# 2. Set up ECR repositories for each service
# 3. Create ECS cluster and task definitions
# 4. Configure environment-specific .env files (.env.development, .env.staging, .env.production)
# 5. Set up CloudWatch log groups for monitoring
# 6. Configure AWS IAM roles for ECS tasks
# 7. Set up required security groups and VPC settings

# Required tool versions:
# - aws-cli ^2.0.0
# - docker ^20.10.0
# - docker-compose ^2.0.0

# Requirement: Container Deployment - Function to check prerequisites
check_prerequisites() {
    echo "Checking deployment prerequisites..."
    
    # Check Docker version
    if ! docker --version | grep -q "20.10"; then
        echo "Error: Docker version 20.10.0 or higher is required"
        return 1
    fi
    
    # Check AWS CLI version and configuration
    if ! aws --version | grep -q "aws-cli/2"; then
        echo "Error: AWS CLI version 2.0.0 or higher is required"
        return 1
    fi
    
    # Check Docker Compose version
    if ! docker-compose --version | grep -q "2."; then
        echo "Error: Docker Compose version 2.0.0 or higher is required"
        return 1
    }
    
    # Verify AWS permissions
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "Error: Invalid AWS credentials or insufficient permissions"
        return 1
    fi
    
    # Check environment file existence
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        echo "Error: Environment file .env.${ENVIRONMENT} not found"
        return 1
    fi
    
    return 0
}

# Requirement: CI/CD Pipeline - Function to load environment variables
load_environment() {
    local env=$1
    echo "Loading ${env} environment configuration..."
    
    # Source environment file
    if [ -f ".env.${env}" ]; then
        set -a
        source ".env.${env}"
        set +a
    else
        echo "Error: Environment file .env.${env} not found"
        return 1
    fi
    
    # Export AWS configuration
    export AWS_DEFAULT_REGION=${AWS_REGION}
    export AWS_PROFILE=${AWS_PROFILE}
    
    # Set deployment variables
    export CLUSTER_NAME=${CLUSTER_NAME:-"pantrychef-${env}"}
    export SERVICE_NAME=${SERVICE_NAME:-"pantrychef-api-${env}"}
    
    return 0
}

# Requirement: Container Deployment - Function to build and push containers
build_containers() {
    local env=$1
    echo "Building containers for ${env} environment..."
    
    # Build containers using docker-compose
    docker-compose -f docker-compose.yml build \
        --build-arg NODE_ENV=${env} \
        --build-arg BUILD_VERSION=$(git rev-parse --short HEAD)
    
    if [ $? -ne 0 ]; then
        echo "Error: Container build failed"
        return 1
    fi
    
    # Tag images for ECR
    docker tag pantrychef-api:latest ${DOCKER_REGISTRY}/pantrychef-api:${env}-$(git rev-parse --short HEAD)
    
    # Run security scan
    docker scan pantrychef-api:latest
    
    # Push to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${DOCKER_REGISTRY}
    docker push ${DOCKER_REGISTRY}/pantrychef-api:${env}-$(git rev-parse --short HEAD)
    
    return 0
}

# Requirement: AWS ECS Deployment - Function to deploy to ECS
deploy_ecs() {
    local cluster_name=$1
    local service_name=$2
    echo "Deploying to ECS cluster: ${cluster_name}, service: ${service_name}..."
    
    # Register new task definition
    local task_def_arn=$(aws ecs register-task-definition \
        --family ${TASK_FAMILY} \
        --container-definitions "[{
            \"name\": \"${CONTAINER_NAME}\",
            \"image\": \"${DOCKER_REGISTRY}/pantrychef-api:${ENVIRONMENT}-$(git rev-parse --short HEAD)\",
            \"cpu\": 2048,
            \"memory\": 4096,
            \"portMappings\": [{\"containerPort\": 3000}],
            \"healthCheck\": {
                \"command\": [\"CMD-SHELL\", \"curl -f http://localhost:3000/health || exit 1\"],
                \"interval\": 30,
                \"timeout\": 5,
                \"retries\": 3
            }
        }]" \
        --requires-compatibilities "FARGATE" \
        --network-mode "awsvpc" \
        --cpu "2048" \
        --memory "4096" \
        --execution-role-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    # Update service with new task definition
    aws ecs update-service \
        --cluster ${cluster_name} \
        --service ${service_name} \
        --task-definition ${task_def_arn} \
        --desired-count 2 \
        --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
        --force-new-deployment
    
    # Wait for service stability
    aws ecs wait services-stable \
        --cluster ${cluster_name} \
        --services ${service_name}
    
    return $?
}

# Requirement: High Availability - Function to handle rollback
rollback() {
    local service_name=$1
    local previous_version=$2
    echo "Initiating rollback to version: ${previous_version}..."
    
    # Stop current deployment
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${service_name} \
        --task-definition ${previous_version} \
        --force-new-deployment
    
    # Wait for rollback to complete
    aws ecs wait services-stable \
        --cluster ${CLUSTER_NAME} \
        --services ${service_name}
    
    # Send rollback notification
    aws sns publish \
        --topic-arn ${NOTIFICATION_TOPIC_ARN} \
        --message "Rollback completed for service ${service_name} to version ${previous_version}"
    
    return $?
}

# Main deployment script
main() {
    # Validate input
    if [ -z "$1" ]; then
        echo "Usage: $0 <environment>"
        exit 1
    fi
    
    export ENVIRONMENT=$1
    
    # Check prerequisites
    check_prerequisites
    if [ $? -ne 0 ]; then
        echo "Prerequisite check failed"
        exit 1
    fi
    
    # Load environment configuration
    load_environment ${ENVIRONMENT}
    if [ $? -ne 0 ]; then
        echo "Environment loading failed"
        exit 1
    fi
    
    # Store current version for potential rollback
    PREVIOUS_VERSION=$(aws ecs describe-services \
        --cluster ${CLUSTER_NAME} \
        --services ${SERVICE_NAME} \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Build and push containers
    build_containers ${ENVIRONMENT}
    if [ $? -ne 0 ]; then
        echo "Container build failed"
        exit 1
    fi
    
    # Deploy to ECS
    deploy_ecs ${CLUSTER_NAME} ${SERVICE_NAME}
    if [ $? -ne 0 ]; then
        echo "Deployment failed, initiating rollback..."
        rollback ${SERVICE_NAME} ${PREVIOUS_VERSION}
        exit 1
    fi
    
    echo "Deployment completed successfully"
    exit 0
}

# Execute main function with environment argument
main "$@"