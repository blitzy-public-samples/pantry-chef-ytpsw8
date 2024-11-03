# Human Tasks:
# 1. Ensure AWS credentials are properly configured for the development environment
# 2. Create the S3 bucket 'pantrychef-terraform-state-dev' for state storage
# 3. Create the DynamoDB table 'terraform-state-lock' for state locking
# 4. Review and adjust resource sizing based on development workload requirements
# 5. Configure AWS WAF rules according to security requirements
# 6. Set up CloudWatch alarms and notifications for monitoring

# Requirement: Development Environment Configuration
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Terraform backend configuration for state management
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket         = "pantrychef-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Requirement: Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: AWS provider configuration for development environment
provider "aws" {
  region = local.region

  default_tags {
    tags = {
      Environment = local.environment
      Project     = local.project_name
      ManagedBy   = "terraform"
    }
  }
}

# Local variables for environment configuration
locals {
  environment        = "dev"
  region            = "us-west-2"
  availability_zones = ["us-west-2a", "us-west-2b"]
  vpc_cidr          = "10.0.0.0/16"
  project_name      = "pantrychef"
}

# Requirement: High Availability
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: VPC module for network infrastructure
module "vpc" {
  source = "../modules/vpc"

  environment          = local.environment
  vpc_cidr            = local.vpc_cidr
  availability_zones  = local.availability_zones
  enable_dns_hostnames = true
  enable_dns_support   = true
  project_name        = local.project_name
}

# Requirement: Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: API Gateway module configuration
module "api_gateway" {
  source = "../modules/api-gateway"

  environment         = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  enable_waf         = true
  enable_vpc_link    = true
  rate_limit         = 1000
  burst_limit        = 2000
  enable_xray        = true
  enable_cache       = true
  enable_access_logs = true
  project_name       = local.project_name

  tags = {
    Environment = local.environment
    Project     = local.project_name
  }
}

# Requirement: High Availability
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: ElastiCache Redis module for caching layer
module "elasticache" {
  source = "../modules/elasticache"

  environment                = local.environment
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  cluster_id                = "pantrychef-redis-dev"
  node_type                 = "cache.t3.medium"
  port                      = 6379
  parameter_family          = "redis6.x"
  automatic_failover_enabled = true
  multi_az_enabled          = true
  num_cache_clusters        = 2
  
  tags = {
    Environment = local.environment
    Project     = local.project_name
  }
}

# Requirement: Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Output values for reference by other modules
output "vpc_id" {
  description = "VPC ID for reference by other environments or modules"
  value       = module.vpc.vpc_id
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL for client applications"
  value       = module.api_gateway.api_gateway_invoke_url
}

output "redis_endpoint" {
  description = "Redis cluster endpoint for application caching"
  value       = module.elasticache.redis_endpoint
}