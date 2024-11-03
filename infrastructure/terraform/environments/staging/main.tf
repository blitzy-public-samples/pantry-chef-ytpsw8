# Requirement: Staging Environment
# Location: 10.1 Deployment Environment/Staging Environment
# Description: Integration testing and QA environment with scaled-down production replica

terraform {
  required_version = ">= 1.0"
  
  # Configure backend for state management
  backend "s3" {
    bucket         = "pantrychef-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "pantrychef-terraform-locks"
  }

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
}

# Define local variables
locals {
  environment        = "staging"
  region            = "us-west-2"
  availability_zones = ["us-west-2a", "us-west-2b"]
  vpc_cidr          = "10.1.0.0/16"
}

# Configure AWS provider
provider "aws" {
  region = local.region

  default_tags {
    tags = {
      Environment = local.environment
      Project     = "PantryChef"
      ManagedBy   = "Terraform"
    }
  }
}

# Requirement: High Availability Architecture
# Location: 5.5 Deployment Architecture
# Description: Multi-AZ VPC configuration with public and private subnets
module "vpc" {
  source = "../modules/vpc"

  environment         = local.environment
  vpc_cidr           = local.vpc_cidr
  availability_zones = local.availability_zones
  
  # VPC Configuration
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # Subnet CIDR blocks
  public_subnet_cidrs  = ["10.1.0.0/24", "10.1.1.0/24"]
  private_subnet_cidrs = ["10.1.2.0/24", "10.1.3.0/24"]
  
  # Tags
  project_name = "pantrychef"
}

# Requirement: Container Orchestration
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: ECS cluster configuration with Fargate tasks and auto-scaling
module "ecs" {
  source = "../modules/ecs"

  environment         = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  cluster_name       = "pantrychef"
  
  # Container insights for monitoring
  container_insights = true
  
  # Service configurations
  task_cpu_map = {
    "api-service"     = 512
    "recipe-service"  = 512
    "image-service"   = 1024
    "pantry-service"  = 512
    "user-service"    = 512
  }
  
  task_memory_map = {
    "api-service"     = 1024
    "recipe-service"  = 1024
    "image-service"   = 2048
    "pantry-service"  = 1024
    "user-service"    = 1024
  }
  
  # Auto-scaling configuration
  service_desired_count = 2
  autoscaling_min_capacity = 1
  autoscaling_max_capacity = 4
  deployment_maximum_percent = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period = 60
}

# Requirement: API Gateway Configuration
# Location: 5.1 High-Level Architecture Overview
# Description: API Gateway with WAF integration and VPC link
module "api_gateway" {
  source = "../modules/api-gateway"

  environment         = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  # API Gateway configuration
  api_name = "pantrychef-api"
  endpoint_type = "REGIONAL"
  minimum_compression_size = 1024
  
  # Logging configuration
  enable_access_logs = true
  log_retention_days = 7
  
  # Cache configuration
  enable_cache = true
  cache_size = "0.5" # Smaller cache size for staging
  
  # Security configuration
  enable_waf = true
  enable_vpc_link = true
  
  # Rate limiting
  burst_limit = 1000
  rate_limit = 500
  
  # Tags
  project_name = "pantrychef"
  tags = {
    Environment = local.environment
    Project     = "PantryChef"
  }
}

# Output important resource identifiers
output "vpc_id" {
  description = "VPC identifier for reference by other environments and modules"
  value       = module.vpc.vpc_id
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL for client applications to access services"
  value       = "${module.api_gateway.api_gateway_id}.execute-api.${local.region}.amazonaws.com/${local.environment}"
}

output "ecs_cluster_name" {
  description = "ECS cluster name for service deployment reference and monitoring"
  value       = module.ecs.cluster_id
}