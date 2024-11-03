# HUMAN TASKS:
# 1. Ensure AWS credentials are properly configured in ~/.aws/credentials or environment variables
# 2. Review and adjust provider versions based on feature requirements
# 3. Configure additional provider settings for production environments
# 4. Set up AWS Organizations for multi-account management if required
# 5. Configure cross-region provider aliases if needed for DR setup

# Requirement: AWS Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Configure AWS as the primary cloud provider with required provider plugins
terraform {
  required_version = ">= 1.0.0"

  required_providers {
    # AWS provider for infrastructure deployment
    # Version ~> 4.0 includes support for all required AWS services
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }

    # Random provider for generating unique identifiers
    # Version ~> 3.0 provides stable random value generation
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Backend configuration should be provided during initialization
  backend "s3" {}
}

# Requirement: Multi-Region Deployment
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Primary AWS provider configuration with region and profile settings
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  # Requirement: Security Configuration
  # Location: 5.6 Security Architecture
  # Description: Default tags for resource tracking and management
  default_tags {
    tags = merge(
      var.common_tags,
      {
        Environment = terraform.workspace
        Project     = "PantryChef"
        ManagedBy   = "Terraform"
      }
    )
  }
}

# Requirement: Multi-Region Deployment
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Secondary region provider for disaster recovery
provider "aws" {
  alias   = "secondary"
  region  = var.secondary_region
  profile = var.aws_profile

  # Consistent tagging across regions
  default_tags {
    tags = merge(
      var.common_tags,
      {
        Environment = terraform.workspace
        Project     = "PantryChef"
        ManagedBy   = "Terraform"
        Region      = "secondary"
      }
    )
  }
}

# Requirement: Security Configuration
# Location: 5.6 Security Architecture
# Description: Random provider for generating unique identifiers
provider "random" {}