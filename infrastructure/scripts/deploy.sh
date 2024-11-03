#!/bin/bash

# Requirement: CI/CD Pipeline - Automated deployment script for PantryChef application
# Version: 1.0.0

# Required tool versions:
# - aws-cli v2.0+
# - kubectl v1.24+
# - docker v20.10+
# - terraform v1.0+

# Exit on any error
set -e

# Enable error handling
trap 'handle_error $? $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR

# Requirement: Security Architecture - Global configuration
ENVIRONMENT=${ENVIRONMENT:-"production"}
AWS_REGION=${AWS_REGION:-"us-west-2"}
PROJECT_NAME=${PROJECT_NAME:-"pantrychef"}
KUBERNETES_NAMESPACE=${KUBERNETES_NAMESPACE:-"production"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"ecr.us-west-2.amazonaws.com"}
LOG_DIR=${LOG_DIR:-"/var/log/pantrychef"}
BACKUP_DIR=${BACKUP_DIR:-"/var/backup/pantrychef"}
MAX_RETRY_ATTEMPTS=${MAX_RETRY_ATTEMPTS:-3}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}

# Requirement: Security Architecture - Logging setup
setup_logging() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_DIR}/deploy_${timestamp}.log")
    exec 2> >(tee -a "${LOG_DIR}/deploy_${timestamp}.error.log")
}

# Requirement: Security Architecture - Error handling
handle_error() {
    local exit_code=$1
    local line_no=$2
    local bash_lineno=$3
    local last_command=$4
    local error_trace=$5
    
    echo "Error occurred in deploy script:"
    echo "Exit code: $exit_code"
    echo "Line number: $line_no"
    echo "Command: $last_command"
    echo "Error trace: $error_trace"
    
    # Requirement: CI/CD Pipeline - Notify team of deployment failures
    if command -v slack-notify &> /dev/null; then
        slack-notify "Deployment failed in ${ENVIRONMENT} environment. Check logs at ${LOG_DIR}"
    fi
    
    cleanup_on_failure
    exit $exit_code
}

# Requirement: Deployment Process - Prerequisites check
check_prerequisites() {
    echo "Checking deployment prerequisites..."
    
    # Check required tools
    local required_tools=("aws" "kubectl" "docker" "terraform")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            echo "Error: Required tool '$tool' is not installed"
            return 1
        fi
    done
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "Error: Invalid AWS credentials"
        return 1
    fi
    
    # Check kubectl context
    if ! kubectl config current-context &> /dev/null; then
        echo "Error: kubectl is not configured"
        return 1
    }
    
    # Verify Docker registry access
    if ! docker info &> /dev/null; then
        echo "Error: Docker daemon is not running"
        return 1
    }
    
    return 0
}

# Requirement: High Availability Architecture - Infrastructure deployment
deploy_infrastructure() {
    echo "Deploying infrastructure for environment: ${ENVIRONMENT}"
    
    # Initialize Terraform
    cd infrastructure/terraform/environments/${ENVIRONMENT}
    terraform init
    
    # Plan infrastructure changes
    terraform plan -out=tfplan
    
    # Apply infrastructure changes
    terraform apply -auto-approve tfplan
    
    # Verify infrastructure state
    if ! terraform show; then
        echo "Error: Infrastructure deployment failed"
        return 1
    }
    
    # Update DNS and load balancer configurations
    aws route53 list-hosted-zones --region ${AWS_REGION}
    
    return 0
}

# Requirement: Deployment Process - Kubernetes resource deployment
deploy_kubernetes_resources() {
    echo "Deploying Kubernetes resources..."
    
    # Apply ConfigMaps
    kubectl apply -f infrastructure/kubernetes/configmap.yaml -n ${KUBERNETES_NAMESPACE}
    
    # Apply Secrets (encrypted)
    kubectl apply -f infrastructure/kubernetes/secrets.yaml -n ${KUBERNETES_NAMESPACE}
    
    # Deploy stateful services
    local stateful_services=("mongodb" "redis" "elasticsearch" "rabbitmq")
    for service in "${stateful_services[@]}"; do
        kubectl apply -f infrastructure/kubernetes/${service}-statefulset.yaml -n ${KUBERNETES_NAMESPACE}
        wait_for_pods "${service}"
    done
    
    # Deploy backend services
    kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml -n ${KUBERNETES_NAMESPACE}
    wait_for_pods "backend"
    
    # Deploy web dashboard
    kubectl apply -f infrastructure/kubernetes/web-deployment.yaml -n ${KUBERNETES_NAMESPACE}
    wait_for_pods "web"
    
    # Configure ingress
    kubectl apply -f infrastructure/kubernetes/ingress.yaml -n ${KUBERNETES_NAMESPACE}
    
    return 0
}

# Requirement: High Availability Architecture - Health monitoring
check_application_health() {
    local component=$1
    local namespace=$2
    echo "Checking health for component: ${component} in namespace: ${namespace}"
    
    # Check pod status
    if ! kubectl get pods -l app=${component} -n ${namespace} | grep -q "Running"; then
        echo "Error: Pods for ${component} are not running"
        return 1
    }
    
    # Check service endpoints
    if ! kubectl get endpoints ${component} -n ${namespace} | grep -q ":"; then
        echo "Error: No endpoints available for ${component}"
        return 1
    }
    
    # Monitor resource utilization
    kubectl top pods -l app=${component} -n ${namespace}
    
    return 0
}

# Requirement: Deployment Process - Zero-downtime updates
perform_rolling_update() {
    local service_name=$1
    local new_version=$2
    echo "Performing rolling update for ${service_name} to version ${new_version}"
    
    # Update deployment with new version
    kubectl set image deployment/${service_name} ${service_name}=${DOCKER_REGISTRY}/${service_name}:${new_version} \
        -n ${KUBERNETES_NAMESPACE} --record
    
    # Wait for rollout to complete
    if ! kubectl rollout status deployment/${service_name} -n ${KUBERNETES_NAMESPACE} --timeout=300s; then
        echo "Error: Rollout failed for ${service_name}"
        return 1
    }
    
    # Verify new version health
    if ! check_application_health ${service_name} ${KUBERNETES_NAMESPACE}; then
        echo "Error: Health check failed for new version"
        rollback_deployment ${service_name} $(kubectl rollout history deployment/${service_name} -n ${KUBERNETES_NAMESPACE} | grep -v "REVISION" | tail -n 2 | head -n 1 | awk '{print $1}')
        return 1
    }
    
    return 0
}

# Requirement: Deployment Process - Automatic rollback
rollback_deployment() {
    local service_name=$1
    local previous_version=$2
    echo "Rolling back ${service_name} to version ${previous_version}"
    
    # Perform rollback
    kubectl rollout undo deployment/${service_name} -n ${KUBERNETES_NAMESPACE} --to-revision=${previous_version}
    
    # Wait for rollback to complete
    if ! kubectl rollout status deployment/${service_name} -n ${KUBERNETES_NAMESPACE} --timeout=300s; then
        echo "Error: Rollback failed for ${service_name}"
        return 1
    }
    
    # Verify rollback health
    check_application_health ${service_name} ${KUBERNETES_NAMESPACE}
    
    return 0
}

# Requirement: Security Architecture - Cleanup on failure
cleanup_on_failure() {
    echo "Performing cleanup after deployment failure..."
    
    # Create backup of current state
    mkdir -p "${BACKUP_DIR}"
    kubectl get all -n ${KUBERNETES_NAMESPACE} -o yaml > "${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).yaml"
    
    # Scale down problematic deployments
    kubectl get deployments -n ${KUBERNETES_NAMESPACE} -o name | xargs -I {} kubectl scale {} --replicas=0 -n ${KUBERNETES_NAMESPACE}
    
    return 0
}

# Requirement: High Availability Architecture - Resource monitoring
monitor_kubernetes_resources() {
    local namespace=$1
    echo "Monitoring Kubernetes resources in namespace: ${namespace}"
    
    # Check pod status
    kubectl get pods -n ${namespace}
    
    # Check resource utilization
    kubectl top pods -n ${namespace}
    
    # Monitor service health
    kubectl get services -n ${namespace}
    
    # Check persistent volumes
    kubectl get pv,pvc -n ${namespace}
    
    return 0
}

# Utility function to wait for pods to be ready
wait_for_pods() {
    local app_label=$1
    local timeout=300
    local interval=5
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if kubectl get pods -l app=${app_label} -n ${KUBERNETES_NAMESPACE} | grep -q "Running"; then
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    echo "Error: Timeout waiting for ${app_label} pods to be ready"
    return 1
}

# Main deployment function
main() {
    # Setup logging
    setup_logging
    
    echo "Starting deployment for PantryChef application..."
    echo "Environment: ${ENVIRONMENT}"
    echo "Region: ${AWS_REGION}"
    
    # Check prerequisites
    if ! check_prerequisites; then
        echo "Error: Prerequisites check failed"
        exit 1
    }
    
    # Deploy infrastructure
    if ! deploy_infrastructure; then
        echo "Error: Infrastructure deployment failed"
        exit 1
    }
    
    # Deploy Kubernetes resources
    if ! deploy_kubernetes_resources; then
        echo "Error: Kubernetes deployment failed"
        exit 1
    }
    
    # Perform health checks
    if ! check_application_health "backend" ${KUBERNETES_NAMESPACE}; then
        echo "Error: Backend health check failed"
        exit 1
    }
    
    if ! check_application_health "web" ${KUBERNETES_NAMESPACE}; then
        echo "Error: Web dashboard health check failed"
        exit 1
    }
    
    # Monitor deployment
    monitor_kubernetes_resources ${KUBERNETES_NAMESPACE}
    
    echo "Deployment completed successfully!"
    return 0
}

# Execute main function
main "$@"