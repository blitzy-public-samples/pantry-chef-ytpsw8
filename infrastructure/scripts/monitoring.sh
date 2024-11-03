#!/bin/bash

# Human Tasks:
# 1. Configure AWS CloudWatch agent on target instances
# 2. Set up AWS SNS topics for alert notifications
# 3. Configure Prometheus server endpoints if using external Prometheus
# 4. Verify AWS IAM permissions for CloudWatch metrics access
# 5. Set up log rotation for monitoring logs
# 6. Configure alert notification endpoints (email, Slack, etc.)

# Exit on error and enable error handling
set -e

# Source deployment configuration and health check utilities
source ./deploy.sh

# External tool versions:
# aws-cli v2.0+ - AWS CloudWatch integration
# kubectl v1.24+ - Kubernetes monitoring
# jq v1.6+ - JSON processing
# prometheus-client v2.40+ - Metrics collection

# Global configuration from specification
ENVIRONMENT=${ENVIRONMENT:-"production"}
AWS_REGION=${AWS_REGION:-"us-west-2"}
PROJECT_NAME=${PROJECT_NAME:-"pantrychef"}
KUBERNETES_NAMESPACE=${KUBERNETES_NAMESPACE:-"production"}
LOG_PATH=${LOG_PATH:-"/var/log/pantrychef/monitoring"}
METRICS_INTERVAL=${METRICS_INTERVAL:-60}

# Alert thresholds from specification
ALERT_THRESHOLD_CPU=${ALERT_THRESHOLD_CPU:-70}
ALERT_THRESHOLD_MEMORY=${ALERT_THRESHOLD_MEMORY:-80}
ALERT_THRESHOLD_ERROR_RATE=${ALERT_THRESHOLD_ERROR_RATE:-0.1}
ALERT_THRESHOLD_API_LATENCY=${ALERT_THRESHOLD_API_LATENCY:-200}
ALERT_THRESHOLD_IMAGE_PROCESSING=${ALERT_THRESHOLD_IMAGE_PROCESSING:-3000}
ALERT_THRESHOLD_AVAILABILITY=${ALERT_THRESHOLD_AVAILABILITY:-99.9}

# Scaling configuration
SCALING_CONFIG_MIN_REPLICAS=${SCALING_CONFIG_MIN_REPLICAS:-2}
SCALING_CONFIG_MAX_REPLICAS=${SCALING_CONFIG_MAX_REPLICAS:-10}
SCALING_CONFIG_CPU_TARGET=${SCALING_CONFIG_CPU_TARGET:-70}
SCALING_CONFIG_MEMORY_TARGET=${SCALING_CONFIG_MEMORY_TARGET:-80}

# Setup logging with rotation
setup_monitoring_logging() {
    mkdir -p "${LOG_PATH}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    exec 1> >(tee -a "${LOG_PATH}/monitoring_${timestamp}.log")
    exec 2> >(tee -a "${LOG_PATH}/monitoring_${timestamp}.error.log")
}

# Requirement: System Metrics - CloudWatch metrics collection
check_cloudwatch_metrics() {
    local component_name=$1
    local metric_namespace=$2
    local time_period=$3
    
    echo "Retrieving CloudWatch metrics for ${component_name}"
    
    # Query CPU utilization
    local cpu_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace "${metric_namespace}" \
        --metric-name CPUUtilization \
        --dimensions Name=ComponentName,Value=${component_name} \
        --start-time $(date -u -v-${time_period}M "+%Y-%m-%dT%H:%M:%SZ") \
        --end-time $(date -u "+%Y-%m-%dT%H:%M:%SZ") \
        --period 300 \
        --statistics Average \
        --region ${AWS_REGION})
    
    # Query memory utilization
    local memory_metrics=$(aws cloudwatch get-metric-statistics \
        --namespace "${metric_namespace}" \
        --metric-name MemoryUtilization \
        --dimensions Name=ComponentName,Value=${component_name} \
        --start-time $(date -u -v-${time_period}M "+%Y-%m-%dT%H:%M:%SZ") \
        --end-time $(date -u "+%Y-%m-%dT%H:%M:%SZ") \
        --period 300 \
        --statistics Average \
        --region ${AWS_REGION})
    
    # Process and analyze metrics
    local cpu_average=$(echo ${cpu_metrics} | jq -r '.Datapoints[0].Average')
    local memory_average=$(echo ${memory_metrics} | jq -r '.Datapoints[0].Average')
    
    # Check against thresholds
    if (( $(echo "$cpu_average > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        handle_alerts "CPU_HIGH" "{\"component\": \"${component_name}\", \"value\": ${cpu_average}, \"threshold\": ${ALERT_THRESHOLD_CPU}}"
    fi
    
    if (( $(echo "$memory_average > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
        handle_alerts "MEMORY_HIGH" "{\"component\": \"${component_name}\", \"value\": ${memory_average}, \"threshold\": ${ALERT_THRESHOLD_MEMORY}}"
    fi
}

# Requirement: Monitoring and Rollback - Kubernetes health monitoring
monitor_kubernetes_health() {
    local namespace=$1
    local resource_types=$2
    
    echo "Monitoring Kubernetes health in namespace: ${namespace}"
    
    # Check pod health status
    local unhealthy_pods=$(kubectl get pods -n ${namespace} --field-selector status.phase!=Running,status.phase!=Succeeded -o json)
    if [[ $(echo ${unhealthy_pods} | jq '.items | length') -gt 0 ]]; then
        handle_alerts "PODS_UNHEALTHY" "${unhealthy_pods}"
    fi
    
    # Monitor resource utilization
    local resource_metrics=$(kubectl top pods -n ${namespace} -o json)
    echo ${resource_metrics} | jq -c '.items[]' | while read -r pod; do
        local pod_name=$(echo ${pod} | jq -r '.metadata.name')
        local cpu_usage=$(echo ${pod} | jq -r '.usage.cpu')
        local memory_usage=$(echo ${pod} | jq -r '.usage.memory')
        
        if [[ ${cpu_usage%m} -gt ${ALERT_THRESHOLD_CPU} ]]; then
            handle_alerts "POD_CPU_HIGH" "{\"pod\": \"${pod_name}\", \"cpu\": ${cpu_usage}}"
        fi
        
        if [[ ${memory_usage%Mi} -gt ${ALERT_THRESHOLD_MEMORY} ]]; then
            handle_alerts "POD_MEMORY_HIGH" "{\"pod\": \"${pod_name}\", \"memory\": ${memory_usage}}"
        fi
    done
}

# Requirement: System Metrics - Application endpoint health checks
check_application_endpoints() {
    local service_name=$1
    local endpoints=$2
    
    echo "Checking health of ${service_name} endpoints"
    
    for endpoint in ${endpoints}; do
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "%{http_code}" ${endpoint})
        local end_time=$(date +%s%N)
        local latency=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        # Check response time against SLA
        if [[ ${latency} -gt ${ALERT_THRESHOLD_API_LATENCY} ]]; then
            handle_alerts "API_LATENCY_HIGH" "{\"endpoint\": \"${endpoint}\", \"latency\": ${latency}, \"threshold\": ${ALERT_THRESHOLD_API_LATENCY}}"
        fi
        
        # Check response code
        if [[ ${response} != "200" ]]; then
            handle_alerts "ENDPOINT_ERROR" "{\"endpoint\": \"${endpoint}\", \"status\": ${response}}"
        fi
    done
}

# Requirement: Monitoring and Rollback - Database health monitoring
monitor_database_health() {
    local database_type=$1
    local connection_string=$2
    
    echo "Monitoring ${database_type} database health"
    
    case ${database_type} in
        "mongodb")
            # Check MongoDB cluster status
            local mongo_status=$(mongosh --eval "rs.status()" --quiet ${connection_string})
            if [[ $(echo ${mongo_status} | jq -r '.ok') != "1" ]]; then
                handle_alerts "MONGODB_UNHEALTHY" "${mongo_status}"
            fi
            
            # Check replication lag
            local replication_lag=$(mongosh --eval "rs.printSlaveReplicationInfo()" --quiet ${connection_string})
            if [[ $(echo ${replication_lag} | grep -c "behind the primary") -gt 0 ]]; then
                handle_alerts "MONGODB_REPLICATION_LAG" "${replication_lag}"
            fi
            ;;
    esac
}

# Requirement: Infrastructure Monitoring - Alert handling
handle_alerts() {
    local alert_type=$1
    local alert_data=$2
    
    echo "Processing alert: ${alert_type}"
    
    # Log alert
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "${timestamp} - ${alert_type}: ${alert_data}" >> "${LOG_PATH}/alerts.log"
    
    # Send to CloudWatch
    aws cloudwatch put-metric-data \
        --namespace "${PROJECT_NAME}/alerts" \
        --metric-name "${alert_type}" \
        --value 1 \
        --timestamp $(date -u "+%Y-%m-%dT%H:%M:%SZ") \
        --region ${AWS_REGION}
    
    # Send notification
    aws sns publish \
        --topic-arn "arn:aws:sns:${AWS_REGION}:${AWS_ACCOUNT_ID}:${PROJECT_NAME}-alerts" \
        --message "${alert_data}" \
        --subject "${PROJECT_NAME} Alert: ${alert_type}" \
        --region ${AWS_REGION}
}

# Requirement: System Metrics - Dynamic threshold adjustment
adjust_monitoring_thresholds() {
    local metric_type=$1
    local historical_data=$2
    
    echo "Adjusting monitoring thresholds for ${metric_type}"
    
    # Calculate baseline from historical data
    local avg_value=$(echo ${historical_data} | jq -r '.datapoints[].value' | awk '{ sum += $1 } END { print sum/NR }')
    local std_dev=$(echo ${historical_data} | jq -r '.datapoints[].value' | awk '{sum+=$1; sumsq+=$1*$1} END {print sqrt(sumsq/NR - (sum/NR)^2)}')
    
    # Adjust thresholds within SLA limits
    case ${metric_type} in
        "cpu")
            local new_threshold=$(echo "scale=2; ${avg_value} + 2*${std_dev}" | bc)
            if (( $(echo "$new_threshold < $ALERT_THRESHOLD_CPU" | bc -l) )); then
                ALERT_THRESHOLD_CPU=${new_threshold}
            fi
            ;;
        "memory")
            local new_threshold=$(echo "scale=2; ${avg_value} + 2*${std_dev}" | bc)
            if (( $(echo "$new_threshold < $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
                ALERT_THRESHOLD_MEMORY=${new_threshold}
            fi
            ;;
    esac
}

# Requirement: Infrastructure Monitoring - Generate monitoring report
generate_monitoring_report() {
    local report_type=$1
    local metrics_data=$2
    
    echo "Generating ${report_type} monitoring report"
    
    local report_file="${LOG_PATH}/report_${report_type}_$(date +%Y%m%d).json"
    
    # Aggregate metrics
    local aggregated_data=$(echo ${metrics_data} | jq -c '{
        "timestamp": now,
        "environment": env.ENVIRONMENT,
        "metrics": {
            "cpu_utilization": .cpu_metrics,
            "memory_utilization": .memory_metrics,
            "api_latency": .latency_metrics,
            "error_rate": .error_metrics,
            "availability": .availability_metrics
        },
        "alerts": .alerts,
        "thresholds": {
            "cpu": env.ALERT_THRESHOLD_CPU,
            "memory": env.ALERT_THRESHOLD_MEMORY,
            "api_latency": env.ALERT_THRESHOLD_API_LATENCY,
            "error_rate": env.ALERT_THRESHOLD_ERROR_RATE
        }
    }')
    
    # Save report
    echo ${aggregated_data} > ${report_file}
    
    # Archive old reports
    find ${LOG_PATH} -name "report_${report_type}_*.json" -mtime +30 -exec gzip {} \;
}

# Main monitoring loop
main() {
    setup_monitoring_logging
    
    echo "Starting PantryChef monitoring system"
    echo "Environment: ${ENVIRONMENT}"
    echo "Region: ${AWS_REGION}"
    
    # Verify prerequisites
    if ! check_prerequisites; then
        echo "Error: Prerequisites check failed"
        exit 1
    }
    
    while true; do
        # Check CloudWatch metrics
        check_cloudwatch_metrics "api-service" "${PROJECT_NAME}/api" ${METRICS_INTERVAL}
        check_cloudwatch_metrics "image-processing" "${PROJECT_NAME}/processing" ${METRICS_INTERVAL}
        
        # Monitor Kubernetes health
        monitor_kubernetes_health ${KUBERNETES_NAMESPACE} "pods,services,deployments"
        
        # Check application endpoints
        check_application_endpoints "api" "https://api.${PROJECT_NAME}.com/health"
        
        # Monitor database health
        monitor_database_health "mongodb" "${MONGODB_CONNECTION_STRING}"
        
        # Generate periodic report
        generate_monitoring_report "hourly" "$(collect_all_metrics)"
        
        # Adjust thresholds periodically
        if [[ $(date +%H) == "00" ]]; then
            adjust_monitoring_thresholds "cpu" "$(get_historical_metrics cpu)"
            adjust_monitoring_thresholds "memory" "$(get_historical_metrics memory)"
        fi
        
        sleep ${METRICS_INTERVAL}
    done
}

# Start monitoring if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi