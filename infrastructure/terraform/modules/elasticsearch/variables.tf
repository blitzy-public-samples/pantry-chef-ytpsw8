# HUMAN TASKS:
# 1. Review and adjust Elasticsearch instance types based on environment-specific workload requirements
# 2. Configure automated snapshot schedules according to backup and recovery requirements
# 3. Review and adjust volume sizes based on data growth projections
# 4. Ensure subnet configurations meet high availability requirements across AZs
# 5. Verify VPC endpoint and security group configurations for proper network isolation

# Requirement: Environment Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Environment-specific deployment configuration
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Requirement: Search Engine Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Elasticsearch version configuration
variable "elasticsearch_version" {
  description = "Version of Elasticsearch to deploy"
  type        = string
  default     = "7.10"
  validation {
    condition     = can(regex("^[0-9]+(\\.[0-9]+)*$", var.elasticsearch_version))
    error_message = "Invalid Elasticsearch version format"
  }
}

# Requirement: High Availability Architecture
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
# Description: Instance configuration for high availability
variable "instance_type" {
  description = "Instance type for Elasticsearch nodes"
  type        = string
  default     = "t3.medium.elasticsearch"
  validation {
    condition     = can(regex("^[a-z][0-9]+\\.[a-z]+\\.elasticsearch$", var.instance_type))
    error_message = "Invalid Elasticsearch instance type"
  }
}

# Requirement: High Availability Architecture
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
# Description: Multi-node cluster configuration
variable "instance_count" {
  description = "Number of instances in the Elasticsearch cluster"
  type        = number
  default     = 3
  validation {
    condition     = var.instance_count >= 3
    error_message = "At least 3 instances required for high availability as per architecture requirements"
  }
}

# Requirement: System Metrics
# Location: APPENDICES/C. SYSTEM METRICS
# Description: Storage configuration for performance optimization
variable "volume_size" {
  description = "Size of EBS volumes attached to each instance (GB)"
  type        = number
  default     = 100
  validation {
    condition     = var.volume_size >= 10
    error_message = "Volume size must be at least 10 GB"
  }
}

# Requirement: Infrastructure Configuration
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Backup configuration
variable "automated_snapshot_start_hour" {
  description = "Hour during which automated snapshots are taken"
  type        = number
  default     = 3
  validation {
    condition     = var.automated_snapshot_start_hour >= 0 && var.automated_snapshot_start_hour <= 23
    error_message = "Snapshot start hour must be between 0 and 23"
  }
}

# Requirement: High Availability Architecture
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
# Description: Network configuration for high availability
variable "vpc_id" {
  description = "ID of the VPC where Elasticsearch will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Elasticsearch deployment"
  type        = list(string)
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnets required for high availability across multiple AZs"
  }
}

# Requirement: Infrastructure Configuration
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Resource tagging configuration
variable "tags" {
  description = "Additional tags for Elasticsearch resources"
  type        = map(string)
  default     = {}
}