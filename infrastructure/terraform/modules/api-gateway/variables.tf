# HUMAN TASKS:
# 1. Configure AWS WAF rules and rule groups for API Gateway protection
# 2. Set up CloudWatch Log Groups with appropriate retention periods
# 3. Configure custom domain names and SSL certificates in AWS Certificate Manager
# 4. Review and adjust rate limiting values based on load testing results
# 5. Configure VPC endpoints for private API access if using PRIVATE endpoint type

# Requirement: API Gateway Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Core project configuration variables
variable "project_name" {
  type        = string
  description = "Name of the project used for resource naming and tagging"
  default     = "pantrychef"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod) affecting security and scaling configurations"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "region" {
  type        = string
  description = "AWS region for API Gateway deployment, supporting multi-region architecture"
}

# Requirement: API Gateway Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: API Gateway specific configuration
variable "api_name" {
  type        = string
  description = "Name of the API Gateway REST API instance"
  default     = "PantryChef-API"
}

variable "endpoint_type" {
  type        = string
  description = "API Gateway endpoint type (EDGE for global reach, REGIONAL for lower latency, PRIVATE for internal access)"
  default     = "REGIONAL"
  validation {
    condition     = contains(["EDGE", "REGIONAL", "PRIVATE"], var.endpoint_type)
    error_message = "Endpoint type must be EDGE, REGIONAL, or PRIVATE."
  }
}

# Requirement: Security Controls
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: Security-related configuration variables
variable "enable_waf" {
  type        = bool
  description = "Enable AWS WAF protection for API Gateway with enterprise security rules"
  default     = true
}

variable "enable_vpc_link" {
  type        = bool
  description = "Enable VPC Link for private API Gateway integration with backend services"
  default     = true
}

variable "rate_limit" {
  type        = number
  description = "API Gateway rate limit per second per client IP"
  default     = 1000
  validation {
    condition     = var.rate_limit >= 100 && var.rate_limit <= 10000
    error_message = "Rate limit must be between 100 and 10000 requests per second."
  }
}

variable "burst_limit" {
  type        = number
  description = "API Gateway burst limit for handling traffic spikes"
  default     = 2000
  validation {
    condition     = var.burst_limit >= var.rate_limit && var.burst_limit <= 20000
    error_message = "Burst limit must be greater than rate limit and not exceed 20000."
  }
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain API Gateway logs for security auditing"
  default     = 30
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch Logs retention period."
  }
}

# Requirement: High Availability
# Location: 10. INFRASTRUCTURE/10.2.2 High Availability Architecture
# Description: Performance and monitoring configuration
variable "enable_xray" {
  type        = bool
  description = "Enable AWS X-Ray tracing for API Gateway request monitoring"
  default     = true
}

variable "enable_cache" {
  type        = bool
  description = "Enable API Gateway cache to improve response times"
  default     = true
}

variable "cache_size" {
  type        = string
  description = "Size of API Gateway cache in GB for response caching"
  default     = "0.5"
  validation {
    condition     = contains(["0.5", "1.6", "6.1", "13.5", "28.4", "58.2", "118", "237"], var.cache_size)
    error_message = "Cache size must be a valid API Gateway cache size."
  }
}

variable "enable_access_logs" {
  type        = bool
  description = "Enable detailed access logging for security audit and monitoring"
  default     = true
}

variable "minimum_compression_size" {
  type        = number
  description = "Minimum response size in bytes to enable compression"
  default     = 1024
  validation {
    condition     = var.minimum_compression_size >= 0 && var.minimum_compression_size <= 10485760
    error_message = "Compression size must be between 0 and 10485760 bytes."
  }
}

# Requirement: Security Controls
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: SSL/TLS configuration
variable "ssl_policy" {
  type        = string
  description = "SSL/TLS policy for API Gateway custom domain names"
  default     = "TLS_1_2"
  validation {
    condition     = contains(["TLS_1_0", "TLS_1_1", "TLS_1_2"], var.ssl_policy)
    error_message = "SSL policy must be TLS_1_0, TLS_1_1, or TLS_1_2."
  }
}

# Requirement: API Gateway Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Resource tagging configuration
variable "tags" {
  type        = map(string)
  description = "Resource tags for API Gateway cost allocation and organization"
  default     = {}
}