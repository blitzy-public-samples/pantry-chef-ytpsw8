# HUMAN TASKS:
# 1. Review and adjust RabbitMQ instance types based on workload requirements for each environment
# 2. Configure maintenance window times according to regional business hours
# 3. Set up CloudWatch alarm thresholds based on application performance requirements
# 4. Review and adjust CIDR blocks for RabbitMQ access based on network security policies
# 5. Verify RabbitMQ engine version compatibility with application requirements

# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Base project configuration
variable "project_name" {
  description = "Project identifier used for resource naming"
  type        = string
  default     = "pantrychef"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Requirement: High Availability
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Network configuration for RabbitMQ deployment
variable "vpc_id" {
  description = "ID of the VPC where RabbitMQ cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for RabbitMQ cluster deployment"
  type        = list(string)
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnet IDs required for high availability"
  }
}

# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: RabbitMQ instance configuration
variable "instance_type" {
  description = "RabbitMQ broker instance type"
  type        = string
  default     = "mq.m5.large"
  validation {
    condition     = can(regex("^mq\\.(m5|t3)\\..*", var.instance_type))
    error_message = "Instance type must be a valid AWS MQ instance type"
  }
}

variable "engine_version" {
  description = "RabbitMQ engine version"
  type        = string
  default     = "3.9.16"
  validation {
    condition     = can(regex("^3\\.9\\.\\d+$", var.engine_version))
    error_message = "Engine version must be a valid 3.9.x version"
  }
}

# Requirement: High Availability
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: High availability configuration
variable "deployment_mode" {
  description = "RabbitMQ deployment mode (SINGLE_INSTANCE, CLUSTER_MULTI_AZ)"
  type        = string
  default     = "CLUSTER_MULTI_AZ"
  validation {
    condition     = can(regex("^(SINGLE_INSTANCE|CLUSTER_MULTI_AZ)$", var.deployment_mode))
    error_message = "Deployment mode must be SINGLE_INSTANCE or CLUSTER_MULTI_AZ"
  }
}

# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Security configuration
variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access RabbitMQ"
  type        = list(string)
  default     = []
}

# Requirement: High Availability
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Maintenance configuration
variable "maintenance_window_start_time" {
  description = "Maintenance window start time in the format ddd:hh:mm (day:hour:minute)"
  type = object({
    day_of_week = string
    time_of_day = string
    time_zone   = string
  })
  default = {
    day_of_week = "Sun"
    time_of_day = "03:00"
    time_zone   = "UTC"
  }
  validation {
    condition     = can(regex("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$", var.maintenance_window_start_time.day_of_week))
    error_message = "Day of week must be a valid three-letter day abbreviation"
  }
}

# Requirement: System Monitoring
# Location: 10. INFRASTRUCTURE/10.5.3 Monitoring and Rollback
# Description: Monitoring configuration
variable "cloudwatch_alarm_config" {
  description = "CloudWatch alarm configuration for RabbitMQ monitoring"
  type = object({
    evaluation_periods = number
    period            = number
    threshold         = number
  })
  default = {
    evaluation_periods = 2
    period            = 300
    threshold         = 80
  }
  validation {
    condition     = var.cloudwatch_alarm_config.period >= 60 && var.cloudwatch_alarm_config.period <= 86400
    error_message = "CloudWatch period must be between 60 and 86400 seconds"
  }
}

# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Resource tagging
variable "tags" {
  description = "Additional tags for RabbitMQ resources"
  type        = map(string)
  default     = {}
}