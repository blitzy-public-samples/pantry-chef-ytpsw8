#!/bin/bash

# Human Tasks:
# 1. Configure AWS IAM roles with necessary permissions for ECS and Kubernetes scaling
# 2. Set up CloudWatch alarms for scaling metrics
# 3. Configure Kubernetes HPA metrics server
# 4. Verify ECS service-linked roles for auto-scaling
# 5. Set up cross-region scaling policies if using multiple regions
# 6. Configure scaling notification endpoints

# Exit on error and enable error handling
set -e

# Source monitoring and deployment functions
source ./monitoring.sh
source ./deploy.sh

# External tool versions:
# aws-cli v2.0+ - AWS ECS and auto-scaling management
# kubectl v1.24+ - Kubernetes HPA and scaling operations
# jq v1.6+ - JSON processing for scaling configurations

# Global configuration
ENVIRONMENT=${ENVIRONMENT:-"production"}
AWS_REGION=${AWS_REGION:-"us-west-2"}
PROJECT_NAME=${PROJECT_NAME:-"pantrychef"}
KUBERNETES_NAMESPACE=${KUBERNETES_NAMESPACE:-"production"}

# Scaling configuration from specification
SCALING_CONFIG_MIN_REPLICAS=${SCALING_CONFIG_MIN_REPLICAS:-2}
SCALING_CONFIG_MAX_REPLICAS=${SCALING_CONFIG_MAX_REPLICAS:-10}
SCALING_CONFIG_CPU_TARGET=${SCALING_CONFIG_CPU_TARGET:-70}
SCALING_CONFIG_MEMORY_TARGET=${SCALING_CONFIG_MEMORY_TARGET:-80}
SCALING_CONFIG_REQUEST_TARGET=${SCALING_CONFIG_REQUEST_TARGET:-1000}
SCALING_CONFIG_API_LATENCY_THRESHOLD=${SCALING_CONFIG_API_LATENCY_THRESHOLD:-200}
SCALING_CONFIG_IMAGE_PROCESSING_THRESHOLD=${SCALING_CONFIG_IMAGE_PROCESSING_THRESHOLD:-3000}

# Requirement: Auto-scaling - ECS service scaling
scale_ecs_service() {
    local service_name=$1
    local cluster_name=$2
    local desired_count=$3
    
    echo "Scaling ECS service: ${service_name} in cluster: ${cluster_name} to ${desired_count} tasks"
    
    # Validate service exists
    if ! aws ecs describe-services --cluster "${cluster_name}" --services "${service_name}" --region "${AWS_REGION}" &>/dev/null; then
        echo "Error: Service ${service_name} not found in cluster ${cluster_name}"
        return 1
    }
    
    # Check current metrics using imported function
    check_cloudwatch_metrics "${service_name}" "AWS/ECS" 5
    
    # Update auto-scaling configuration
    aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${cluster_name}/${service_name} \
        --min-capacity ${SCALING_CONFIG_MIN_REPLICAS} \
        --max-capacity ${SCALING_CONFIG_MAX_REPLICAS} \
        --region "${AWS_REGION}"
    
    # Configure CPU-based scaling policy
    aws application-autoscaling put-scaling-policy \
        --policy-name "${service_name}-cpu-scaling" \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${cluster_name}/${service_name} \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration "{
            \"TargetValue\": ${SCALING_CONFIG_CPU_TARGET},
            \"PredefinedMetricSpecification\": {
                \"PredefinedMetricType\": \"ECSServiceAverageCPUUtilization\"
            },
            \"ScaleOutCooldown\": 300,
            \"ScaleInCooldown\": 300
        }" \
        --region "${AWS_REGION}"
    
    # Configure memory-based scaling policy
    aws application-autoscaling put-scaling-policy \
        --policy-name "${service_name}-memory-scaling" \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${cluster_name}/${service_name} \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration "{
            \"TargetValue\": ${SCALING_CONFIG_MEMORY_TARGET},
            \"PredefinedMetricSpecification\": {
                \"PredefinedMetricType\": \"ECSServiceAverageMemoryUtilization\"
            },
            \"ScaleOutCooldown\": 300,
            \"ScaleInCooldown\": 300
        }" \
        --region "${AWS_REGION}"
    
    # Update desired count if specified
    if [ -n "${desired_count}" ]; then
        aws ecs update-service \
            --cluster "${cluster_name}" \
            --service "${service_name}" \
            --desired-count "${desired_count}" \
            --region "${AWS_REGION}"
    fi
    
    # Monitor scaling operation using imported function
    monitor_kubernetes_health "${KUBERNETES_NAMESPACE}" "deployments"
    
    # Verify service health using imported function
    check_application_health "${service_name}" "${KUBERNETES_NAMESPACE}"
}

# Requirement: High Availability - Kubernetes HPA management
update_kubernetes_hpa() {
    local deployment_name=$1
    local namespace=$2
    local scaling_config=$3
    
    echo "Updating HPA for deployment: ${deployment_name} in namespace: ${namespace}"
    
    # Verify deployment status using imported function
    monitor_kubernetes_resources "${namespace}"
    
    # Create or update HPA
    kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${deployment_name}-hpa
  namespace: ${namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${deployment_name}
  minReplicas: ${SCALING_CONFIG_MIN_REPLICAS}
  maxReplicas: ${SCALING_CONFIG_MAX_REPLICAS}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${SCALING_CONFIG_CPU_TARGET}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: ${SCALING_CONFIG_MEMORY_TARGET}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
    scaleUp:
      stabilizationWindowSeconds: 60
EOF
    
    # Monitor HPA status
    monitor_kubernetes_health "${namespace}" "hpa"
    
    # Validate pod health using imported function
    check_application_health "${deployment_name}" "${namespace}"
}

# Requirement: Performance Metrics - Scaling metrics analysis
check_scaling_metrics() {
    local component_name=$1
    local metric_type=$2
    
    echo "Analyzing scaling metrics for ${component_name}"
    
    # Collect performance metrics using imported function
    check_cloudwatch_metrics "${component_name}" "AWS/ApplicationELB" 5
    
    # Analyze resource utilization
    local cpu_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/ECS" \
        --metric-name CPUUtilization \
        --dimensions Name=ServiceName,Value=${component_name} \
        --start-time $(date -u -v-5M "+%Y-%m-%dT%H:%M:%SZ") \
        --end-time $(date -u "+%Y-%m-%dT%H:%M:%SZ") \
        --period 60 \
        --statistics Average \
        --region "${AWS_REGION}")
    
    local memory_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/ECS" \
        --metric-name MemoryUtilization \
        --dimensions Name=ServiceName,Value=${component_name} \
        --start-time $(date -u -v-5M "+%Y-%m-%dT%H:%M:%SZ") \
        --end-time $(date -u "+%Y-%m-%dT%H:%M:%SZ") \
        --period 60 \
        --statistics Average \
        --region "${AWS_REGION}")
    
    # Check request patterns and API latency
    local request_count=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/ApplicationELB" \
        --metric-name RequestCount \
        --dimensions Name=ServiceName,Value=${component_name} \
        --start-time $(date -u -v-5M "+%Y-%m-%dT%H:%M:%SZ") \
        --end-time $(date -u "+%Y-%m-%dT%H:%M:%SZ") \
        --period 60 \
        --statistics Sum \
        --region "${AWS_REGION}")
    
    # Generate scaling recommendations
    echo "{
        \"component\": \"${component_name}\",
        \"metrics\": {
            \"cpu\": $(echo ${cpu_metrics} | jq -r '.Datapoints[0].Average'),
            \"memory\": $(echo ${memory_metrics} | jq -r '.Datapoints[0].Average'),
            \"requests\": $(echo ${request_count} | jq -r '.Datapoints[0].Sum')
        },
        \"recommendations\": {
            \"scale_cpu\": $([ $(echo ${cpu_metrics} | jq -r '.Datapoints[0].Average') -gt ${SCALING_CONFIG_CPU_TARGET} ] && echo "true" || echo "false"),
            \"scale_memory\": $([ $(echo ${memory_metrics} | jq -r '.Datapoints[0].Average') -gt ${SCALING_CONFIG_MEMORY_TARGET} ] && echo "true" || echo "false"),
            \"scale_requests\": $([ $(echo ${request_count} | jq -r '.Datapoints[0].Sum') -gt ${SCALING_CONFIG_REQUEST_TARGET} ] && echo "true" || echo "false")
        }
    }"
}

# Requirement: High Availability - Scaling event handler
handle_scaling_event() {
    local event_type=$1
    local event_data=$2
    
    echo "Processing scaling event: ${event_type}"
    
    # Validate scaling trigger
    local current_metrics=$(check_scaling_metrics $(echo ${event_data} | jq -r '.component') "all")
    
    # Determine scaling action
    case ${event_type} in
        "cpu_high")
            if [ $(echo ${current_metrics} | jq -r '.recommendations.scale_cpu') == "true" ]; then
                scale_ecs_service \
                    $(echo ${event_data} | jq -r '.component') \
                    "${PROJECT_NAME}-cluster" \
                    $(($(echo ${event_data} | jq -r '.current_count') + 1))
            fi
            ;;
        "memory_high")
            if [ $(echo ${current_metrics} | jq -r '.recommendations.scale_memory') == "true" ]; then
                scale_ecs_service \
                    $(echo ${event_data} | jq -r '.component') \
                    "${PROJECT_NAME}-cluster" \
                    $(($(echo ${event_data} | jq -r '.current_count') + 1))
            fi
            ;;
        "request_surge")
            if [ $(echo ${current_metrics} | jq -r '.recommendations.scale_requests') == "true" ]; then
                update_kubernetes_hpa \
                    $(echo ${event_data} | jq -r '.component') \
                    "${KUBERNETES_NAMESPACE}" \
                    "{\"min\": ${SCALING_CONFIG_MIN_REPLICAS}, \"max\": ${SCALING_CONFIG_MAX_REPLICAS}}"
            fi
            ;;
    esac
    
    # Monitor scaling progress using imported function
    monitor_kubernetes_health "${KUBERNETES_NAMESPACE}" "all"
    
    # Log scaling activity
    echo "$(date -u "+%Y-%m-%dT%H:%M:%SZ") - Scaling event processed: ${event_type} for component: $(echo ${event_data} | jq -r '.component')" >> /var/log/pantrychef/scaling.log
    
    return 0
}

# Main function
main() {
    echo "Starting PantryChef scaling management"
    echo "Environment: ${ENVIRONMENT}"
    echo "Region: ${AWS_REGION}"
    
    # Monitor and handle scaling events continuously
    while true; do
        # Check ECS services
        for service in $(aws ecs list-services --cluster "${PROJECT_NAME}-cluster" --region "${AWS_REGION}" | jq -r '.serviceArns[]'); do
            check_scaling_metrics $(basename ${service}) "all"
        done
        
        # Check Kubernetes deployments
        for deployment in $(kubectl get deployments -n "${KUBERNETES_NAMESPACE}" -o json | jq -r '.items[].metadata.name'); do
            check_scaling_metrics ${deployment} "all"
        done
        
        sleep 60
    done
}

# Start scaling management if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi