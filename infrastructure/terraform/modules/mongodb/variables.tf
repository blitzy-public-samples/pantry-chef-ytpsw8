# HUMAN TASKS:
# 1. Ensure AWS KMS key is configured for storage encryption when storage_encrypted is set to true
# 2. Configure VPC security groups to allow MongoDB access from specified CIDR blocks
# 3. Verify backup and maintenance windows do not overlap in production environment
# 4. Review instance class selection based on workload requirements before deployment

# Requirement: Primary Database
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Environment variable for MongoDB deployment configuration
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Requirement: Primary Database
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Project name variable for resource naming consistency
variable "project_name" {
  description = "Name of the project for resource naming"
  type        = string
  default     = "pantrychef"
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: MongoDB instance class configuration for performance requirements
variable "instance_class" {
  description = "MongoDB instance class for cluster nodes"
  type        = string
  default     = "db.r5.large"
  validation {
    condition     = can(regex("^db\\.(r5|r6g)\\.(large|xlarge|2xlarge)$", var.instance_class))
    error_message = "Instance class must be a valid MongoDB-compatible instance type"
  }
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Cluster size configuration for high availability
variable "cluster_size" {
  description = "Number of nodes in MongoDB cluster (minimum 3 for high availability)"
  type        = number
  default     = 3
  validation {
    condition     = var.cluster_size >= 3 && var.cluster_size <= 7
    error_message = "Cluster size must be between 3 and 7 nodes for high availability"
  }
}

# Requirement: Primary Database
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: MongoDB engine version configuration
variable "engine_version" {
  description = "MongoDB engine version"
  type        = string
  default     = "4.0"
  validation {
    condition     = can(regex("^[4-5]\\.[0-9]$", var.engine_version))
    error_message = "MongoDB engine version must be 4.0 or higher"
  }
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Backup retention configuration for data protection
variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days"
  }
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Backup window configuration for automated backups
variable "backup_window" {
  description = "Preferred backup window in UTC (must not overlap with maintenance window)"
  type        = string
  default     = "03:00-04:00"
  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM"
  }
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Maintenance window configuration for system updates
variable "maintenance_window" {
  description = "Preferred maintenance window in UTC (must not overlap with backup window)"
  type        = string
  default     = "sun:05:00-sun:06:00"
  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-5][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-5][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in format day:HH:MM-day:HH:MM"
  }
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: Network access control configuration for MongoDB cluster
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access MongoDB (should be restricted to application subnets)"
  type        = list(string)
  default     = []
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: Storage encryption configuration using AWS KMS
variable "storage_encrypted" {
  description = "Enable AES-256 storage encryption using AWS KMS"
  type        = bool
  default     = true
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Final snapshot configuration for cluster termination
variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying cluster (should be false in production)"
  type        = bool
  default     = false
}

# Requirement: Primary Database
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Resource tagging configuration for MongoDB cluster
variable "tags" {
  description = "Additional resource tags for MongoDB cluster"
  type        = map(string)
  default     = {}
}