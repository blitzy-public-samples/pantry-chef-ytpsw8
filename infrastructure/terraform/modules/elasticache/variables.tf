# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for ElastiCache management
# 2. Configure VPC security groups to allow Redis port access (default: 6379)
# 3. Set up CloudWatch alarms for cache monitoring using the exposed variables
# 4. Review maintenance window timing based on application usage patterns
# 5. Validate Redis parameter group settings align with application requirements

# Requirement: Cache Layer Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "cluster_id" {
  description = "Identifier for the Redis cluster"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.cluster_id))
    error_message = "Cluster ID must contain only alphanumeric characters and hyphens"
  }
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
variable "node_type" {
  description = "ElastiCache node instance type"
  type        = string
  default     = "cache.t3.medium"
}

variable "port" {
  description = "Port number for Redis connections"
  type        = number
  default     = 6379
}

variable "parameter_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis6.x"
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
variable "automatic_failover_enabled" {
  description = "Enable automatic failover for Redis cluster"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ deployment for Redis cluster"
  type        = bool
  default     = true
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (primary and replicas)"
  type        = number
  default     = 2
  validation {
    condition     = var.num_cache_clusters >= 2
    error_message = "At least 2 cache clusters are required for high availability"
  }
}

# Requirement: Resource Monitoring
# Location: APPENDICES/C. SYSTEM METRICS
variable "redis_parameters" {
  description = "Redis parameter group settings"
  type        = map(string)
  default = {
    maxmemory-policy      = "allkeys-lru"
    maxmemory-samples     = "5"
    timeout               = "300"
    tcp-keepalive        = "300"
    notify-keyspace-events = "Ex"
    appendonly           = "yes"
  }
}

variable "tags" {
  description = "Resource tags for Redis cluster"
  type        = map(string)
  default = {
    Service     = "PantryChef"
    Component   = "Cache"
    Environment = "${var.environment}"
    ManagedBy   = "Terraform"
  }
}

variable "maintenance_window" {
  description = "Weekly time range for maintenance operations"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic cache cluster snapshots"
  type        = number
  default     = 7
}