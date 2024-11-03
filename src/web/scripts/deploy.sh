#!/bin/bash

# Human Tasks:
# 1. Ensure AWS CLI v2.x is installed and configured with proper ECS deployment permissions
# 2. Configure AWS credentials with access to ECR, ECS, CloudWatch
# 3. Set up AWS VPC and security groups for ECS cluster
# 4. Create ECR repository if not exists
# 5. Configure environment variables in CI/CD system:
#    - AWS_REGION
#    - ECR_REPOSITORY
#    - ECS_CLUSTER
#    - ECS_SERVICE
#    - TASK_FAMILY
#    - MIN_HEALTHY_PERCENT (optional, default: 100)
#    - MAX_PERCENT (optional, default: 200)
#    - HEALTH_CHECK_GRACE_PERIOD (optional, default: 60)

# Set error handling
set -e
trap 'error_handler $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# Initialize logging
LOG_GROUP="/aws/ecs/pantrychef-web-deploy"
LOG_STREAM="deployment-$(date +%Y-%m-%d-%H-%M-%S)"

# Function to handle errors and send to CloudWatch
error_handler() {
    local exit_code=$1
    local line_number=$2
    local bash_lineno=$3
    local last_command=$4
    local func_stack=$5
    
    aws logs create-log-stream --log-group-name "$LOG_GROUP" --log-stream-name "$LOG_STREAM" || true
    
    local error_message="Error $exit_code occurred on line $line_number: $last_command. Function stack: $func_stack"
    aws logs put-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$LOG_STREAM" \
        --log-events timestamp=$(date +%s000),message="$error_message"
    
    echo "Deployment failed: $error_message"
    exit $exit_code
}

# Function to check prerequisites
# Requirement: Web Application Deployment - Verify required tools and permissions
check_prerequisites() {
    echo "Checking deployment prerequisites..."
    
    # Check AWS CLI version
    if ! aws --version | grep -q "aws-cli/2"; then
        echo "Error: AWS CLI v2.x is required"
        return 1
    }
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "Error: AWS credentials not configured or invalid"
        return 1
    }
    
    # Check Docker installation
    if ! docker --version | grep -q "20"; then
        echo "Error: Docker 20.x or higher is required"
        return 1
    }
    
    # Verify Docker daemon is running
    if ! docker info &>/dev/null; then
        echo "Error: Docker daemon is not running"
        return 1
    }
    
    # Check required environment variables
    local required_vars=("AWS_REGION" "ECR_REPOSITORY" "ECS_CLUSTER" "ECS_SERVICE" "TASK_FAMILY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "Error: Required environment variable $var is not set"
            return 1
        fi
    done
    
    # Set default values for optional variables
    MIN_HEALTHY_PERCENT=${MIN_HEALTHY_PERCENT:-100}
    MAX_PERCENT=${MAX_PERCENT:-200}
    HEALTH_CHECK_GRACE_PERIOD=${HEALTH_CHECK_GRACE_PERIOD:-60}
    
    # Verify ECR repository exists
    if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" &>/dev/null; then
        echo "Error: ECR repository $ECR_REPOSITORY does not exist"
        return 1
    }
    
    echo "Prerequisites check passed"
    return 0
}

# Function to build and push Docker image
# Requirement: CI/CD Pipeline - Production deployment stage
build_and_push() {
    echo "Building and pushing Docker image..."
    
    # Get ECR login token and authenticate
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin \
        "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build Docker image with production optimizations
    DOCKER_BUILDKIT=1 docker build \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
        -t "$ECR_REPOSITORY:latest" \
        -t "$ECR_REPOSITORY:${COMMIT_SHA}" \
        -f Dockerfile .
    
    # Run security scan
    docker scan "$ECR_REPOSITORY:latest" || {
        echo "Security vulnerabilities detected in image"
        return 1
    }
    
    # Push images to ECR
    docker push "$ECR_REPOSITORY:latest"
    docker push "$ECR_REPOSITORY:${COMMIT_SHA}"
    
    # Verify image digest
    aws ecr describe-images --repository-name "$ECR_REPOSITORY" \
        --image-ids imageTag=latest --query 'imageDetails[0].imageDigest' --output text
    
    echo "Image build and push completed"
    return 0
}

# Function to update ECS service
# Requirement: Web Application Deployment - Zero-downtime deployment strategy
update_ecs_service() {
    echo "Updating ECS service..."
    
    # Get current task definition
    local task_def_arn=$(aws ecs describe-task-definition \
        --task-definition "$TASK_FAMILY" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    # Create new task definition
    local new_task_def=$(aws ecs describe-task-definition \
        --task-definition "$TASK_FAMILY" \
        --query 'taskDefinition' | \
        jq ".containerDefinitions[0].image = \"$ECR_REPOSITORY:${COMMIT_SHA}\"" | \
        jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities)')
    
    # Register new task definition
    local new_task_def_arn=$(aws ecs register-task-definition \
        --cli-input-json "$new_task_def" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    # Update service with new task definition
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --task-definition "$new_task_def_arn" \
        --deployment-configuration "minimumHealthyPercent=$MIN_HEALTHY_PERCENT,maximumPercent=$MAX_PERCENT" \
        --health-check-grace-period-seconds "$HEALTH_CHECK_GRACE_PERIOD"
    
    # Monitor deployment
    echo "Monitoring deployment progress..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE"
    
    # Verify health checks
    local target_group_arn=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --query 'services[0].loadBalancers[0].targetGroupArn' \
        --output text)
    
    aws elbv2 describe-target-health \
        --target-group-arn "$target_group_arn" \
        --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`]' \
        --output text
    
    echo "Service update completed successfully"
    return 0
}

# Function to handle rollback
# Requirement: CI/CD Pipeline - Automated rollback capabilities
rollback() {
    local previous_task_def=$1
    echo "Initiating rollback to previous task definition: $previous_task_def"
    
    # Log rollback event
    aws logs put-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$LOG_STREAM" \
        --log-events timestamp=$(date +%s000),message="Initiating rollback to $previous_task_def"
    
    # Update service to previous task definition
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --task-definition "$previous_task_def" \
        --deployment-configuration "minimumHealthyPercent=$MIN_HEALTHY_PERCENT,maximumPercent=$MAX_PERCENT"
    
    # Wait for rollback to complete
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE"
    
    # Verify health after rollback
    local target_group_arn=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --query 'services[0].loadBalancers[0].targetGroupArn' \
        --output text)
    
    aws elbv2 describe-target-health \
        --target-group-arn "$target_group_arn"
    
    # Send notification
    aws sns publish \
        --topic-arn "$SNS_TOPIC_ARN" \
        --message "Deployment rollback completed for $ECS_SERVICE"
    
    echo "Rollback completed"
    return 0
}

# Main deployment flow
main() {
    # Create CloudWatch log group if it doesn't exist
    aws logs create-log-group --log-group-name "$LOG_GROUP" || true
    
    # Store current task definition for potential rollback
    CURRENT_TASK_DEF=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Execute deployment steps
    if check_prerequisites && \
       build_and_push && \
       update_ecs_service; then
        echo "Deployment completed successfully"
        exit 0
    else
        echo "Deployment failed, initiating rollback"
        rollback "$CURRENT_TASK_DEF"
        exit 1
    fi
}

# Execute main function
main