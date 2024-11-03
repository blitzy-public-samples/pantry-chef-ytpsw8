# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate credentials and region
# 2. Verify that the AWS region selected supports all required availability zones
# 3. Review and adjust CIDR blocks according to your network architecture requirements
# 4. Confirm VPC limits in the target AWS account

# Required provider version
# terraform ~> 1.0

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Multi-AZ deployment with redundant networking components across availability zones
variable "availability_zones" {
  description = "List of AWS availability zones for multi-AZ high availability deployment"
  type        = list(string)
  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability as per architecture requirements"
  }
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Network isolation through VPC and subnet configurations
variable "vpc_cidr" {
  description = "CIDR block for the VPC network space"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vpc_cidr))
    error_message = "VPC CIDR block must be a valid IPv4 CIDR notation"
  }
}

# Requirement: Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: AWS VPC infrastructure configuration for production environment
variable "environment" {
  description = "Deployment environment name for resource tagging (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Public and private subnet separation for secure component isolation
variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets, one per AZ for load balancers and bastion hosts"
  type        = list(string)
  validation {
    condition     = length(var.public_subnet_cidrs) == length(var.availability_zones)
    error_message = "Number of public subnet CIDRs must match number of availability zones for balanced distribution"
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets, one per AZ for application and database instances"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_cidrs) == length(var.availability_zones)
    error_message = "Number of private subnet CIDRs must match number of availability zones for balanced distribution"
  }
}

# DNS configuration for service discovery
variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC for service discovery"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC for name resolution"
  type        = bool
  default     = true
}

# Resource naming
variable "project_name" {
  description = "Project name for resource naming and tagging"
  type        = string
  default     = "pantrychef"
}