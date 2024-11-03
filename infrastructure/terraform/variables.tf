# HUMAN TASKS:
# 1. Review and adjust AWS region configurations based on latency requirements and compliance needs
# 2. Configure CloudWatch Log Groups with appropriate retention periods for each environment
# 3. Set up WAF rules and rule groups according to security requirements
# 4. Configure backup retention policies based on data recovery requirements
# 5. Review and adjust resource tags for cost allocation and organization

# Requirement: Infrastructure Configuration
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Core project configuration variables
variable "project" {
  type        = string
  description = "Project name used for resource naming and tagging"
  default     = "pantrychef"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Requirement: High Availability Setup
# Location: 10.2.2 High Availability Architecture
# Description: Multi-region configuration for high availability
variable "aws_region" {
  type        = string
  description = "Primary AWS region for resource deployment"
  default     = "us-west-2"
}

variable "secondary_region" {
  type        = string
  description = "Secondary AWS region for disaster recovery"
  default     = "us-east-1"
}

# Requirement: Infrastructure Configuration
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Network configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

# Requirement: High Availability Setup
# Location: 10.2.2 High Availability Architecture
# Description: High availability configuration options
variable "enable_multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment for high availability"
  default     = true
}

# Requirement: Cloud Services Configuration
# Location: 10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Monitoring and logging configuration
variable "enable_monitoring" {
  type        = bool
  description = "Enable CloudWatch monitoring and logging"
  default     = true
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain CloudWatch logs"
  default     = 30
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch Logs retention period."
  }
}

variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups"
  default     = 7
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

# Requirement: Cloud Services Configuration
# Location: 10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Security and service enablement configuration
variable "enable_waf" {
  type        = bool
  description = "Enable AWS WAF for application security"
  default     = true
}

variable "enable_cloudfront" {
  type        = bool
  description = "Enable CloudFront CDN for static asset delivery"
  default     = true
}

variable "enable_route53" {
  type        = bool
  description = "Enable Route 53 DNS management"
  default     = true
}

# Requirement: Cloud Services Configuration
# Location: 10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Database and caching service configuration
variable "enable_elasticache" {
  type        = bool
  description = "Enable ElastiCache Redis for caching layer"
  default     = true
}

variable "enable_elasticsearch" {
  type        = bool
  description = "Enable Elasticsearch for recipe search engine"
  default     = true
}

variable "enable_rabbitmq" {
  type        = bool
  description = "Enable RabbitMQ for message queue"
  default     = true
}

# Requirement: Infrastructure Configuration
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Resource tagging configuration
variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    Project    = "PantryChef"
    ManagedBy  = "Terraform"
    Environment = "${var.environment}"
  }
}