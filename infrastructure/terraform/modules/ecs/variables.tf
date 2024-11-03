# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for ECS resource creation
# 2. Review and adjust CPU/memory allocations based on actual service performance metrics
# 3. Verify that the selected AWS region supports ECS capacity providers
# 4. Configure CloudWatch Container Insights IAM permissions if enabled

# Requirement: Container Orchestration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Core ECS cluster configuration for microservices deployment
variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "pantrychef"
}

# Requirement: High Availability
# Location: 10.1 Deployment Environment
# Description: Environment-specific configuration for high availability deployment
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Requirement: Container Orchestration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: VPC networking configuration for ECS deployment
variable "vpc_id" {
  description = "ID of the VPC where ECS cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS task deployment"
  type        = list(string)
}

# Requirement: Container Orchestration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Monitoring configuration for ECS cluster
variable "container_insights" {
  description = "Enable CloudWatch Container Insights for the cluster"
  type        = bool
  default     = true
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Service-specific CPU allocations based on workload requirements
variable "task_cpu_map" {
  description = "Map of service names to their CPU allocations in AWS CPU units (1024 = 1 vCPU)"
  type        = map(number)
  default = {
    api              = 2048  # 2 vCPU for API services
    image-processing = 4096  # 4 vCPU for Image Processing
    worker           = 2048  # 2 vCPU for Queue Worker
  }
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Service-specific memory allocations based on workload requirements
variable "task_memory_map" {
  description = "Map of service names to their memory allocations in MiB"
  type        = map(number)
  default = {
    api              = 4096  # 4GB RAM for API services
    image-processing = 8192  # 8GB RAM for Image Processing
    worker           = 4096  # 4GB RAM for Queue Worker
  }
}

# Requirement: High Availability
# Location: 10.1 Deployment Environment
# Description: Service deployment configuration for high availability
variable "service_desired_count" {
  description = "Desired number of tasks per service for baseline capacity"
  type        = number
  default     = 2
}

variable "health_check_grace_period" {
  description = "Grace period for service health checks in seconds"
  type        = number
  default     = 60
}

# Requirement: High Availability
# Location: 10.1 Deployment Environment
# Description: Rolling deployment configuration for zero-downtime updates
variable "deployment_maximum_percent" {
  description = "Maximum percent of tasks during deployment for rolling updates"
  type        = number
  default     = 200
}

variable "deployment_minimum_healthy_percent" {
  description = "Minimum healthy percent during deployment to ensure availability"
  type        = number
  default     = 100
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Auto-scaling configuration for dynamic workload handling
variable "autoscaling_max_capacity" {
  description = "Maximum number of tasks for auto-scaling based on load"
  type        = number
  default     = 4
}

variable "autoscaling_min_capacity" {
  description = "Minimum number of tasks for auto-scaling to maintain availability"
  type        = number
  default     = 1
}