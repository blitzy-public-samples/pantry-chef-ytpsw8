# HUMAN TASKS:
# 1. Ensure the S3 bucket for state storage is created before applying this configuration
# 2. Configure appropriate IAM policies for state bucket and DynamoDB table access
# 3. Review and adjust encryption settings based on security requirements
# 4. Set up appropriate backup and versioning policies for the state bucket
# 5. Configure appropriate access logging for the state bucket

# Requirement: Infrastructure State Management
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Configure secure and scalable state management for multi-environment infrastructure deployment
terraform {
  # AWS provider version constraint
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # Requirement: High Availability Setup
  # Location: 10.2.2 High Availability Architecture
  # Description: Support state management for high availability infrastructure across multiple regions
  backend "s3" {
    bucket = "pantrychef-terraform-state-${var.environment}"
    key    = "terraform.tfstate"
    region = var.aws_region

    # Requirement: Security Configuration
    # Location: 5.6 Security Architecture
    # Description: Ensure secure storage and access control for infrastructure state
    encrypt        = true
    # Use DynamoDB for state locking to prevent concurrent modifications
    dynamodb_table = "pantrychef-terraform-locks-${var.environment}"
    
    # Organize state files by project and environment
    workspace_key_prefix = var.project
  }
}

# Requirement: Security Configuration
# Location: 5.6 Security Architecture
# Description: Configure secure access to AWS resources
provider "aws" {
  region = var.aws_region

  # Apply default tags to all resources
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Requirement: High Availability Setup
# Location: 10.2.2 High Availability Architecture
# Description: Configure secondary region provider for disaster recovery
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region

  # Apply default tags to all resources in secondary region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = "Secondary"
    }
  }
}