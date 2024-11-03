# HUMAN TASKS:
# 1. Review and adjust KMS key configurations for each environment if custom encryption is needed
# 2. Configure CORS rules based on specific frontend domain requirements
# 3. Review and adjust lifecycle rules based on data retention requirements
# 4. Verify replication region settings comply with data residency requirements
# 5. Ensure public access settings align with security policies

# Requirement: S3 Storage Configuration
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Core bucket configuration
variable "bucket_name" {
  description = "Name of the S3 bucket to create"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name))
    error_message = "Bucket name must be lowercase alphanumeric characters or hyphens"
  }
}

variable "region" {
  description = "AWS region where the S3 bucket will be created"
  type        = string
  default     = "us-west-2"
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security/9.2.1 Encryption Standards
# Description: Bucket encryption configuration
variable "enable_encryption" {
  description = "Enable AES-256 server-side encryption for the S3 bucket"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of KMS key for bucket encryption. If not provided, AES-256 encryption will be used"
  type        = string
  default     = null
}

# Requirement: High Availability
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Cross-region replication settings
variable "enable_versioning" {
  description = "Enable versioning on the S3 bucket for data protection"
  type        = bool
  default     = true
}

variable "enable_replication" {
  description = "Enable cross-region replication for high availability"
  type        = bool
  default     = true
}

variable "replication_region" {
  description = "Destination region for cross-region replication"
  type        = string
  default     = "us-east-1"
}

# Requirement: S3 Storage Configuration
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Bucket lifecycle configuration
variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    name            = string
    enabled         = bool
    expiration_days = number
  }))
  default = [{
    name            = "image_expiration"
    enabled         = true
    expiration_days = 30
  }]
}

# Requirement: S3 Storage Configuration
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: CORS configuration for web access
variable "cors_rules" {
  description = "CORS rules for the bucket"
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = list(string)
    max_age_seconds = number
  }))
  default = [{
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }]
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security/9.2.1 Encryption Standards
# Description: Public access configuration
variable "public_access_enabled" {
  description = "Enable public access to the bucket. Should be false for production"
  type        = bool
  default     = false
}

# Reference deployment environment configuration
variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
}

# Reference common resource tags
variable "common_tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
}