# Requirement: Production Infrastructure
# Location: 10.1 Deployment Environment/Production Environment
# Description: Multi-AZ, auto-scaling production environment configuration with high availability

# Configure Terraform settings and required providers
terraform {
  required_version = ">= 1.0"

  # Requirement: System Architecture
  # Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
  # Description: Backend configuration for state management
  backend "s3" {
    bucket         = "pantrychef-terraform-state"
    key            = "prod/terraform.tfstate"
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

# Local variables for environment configuration
locals {
  environment        = "prod"
  region            = "us-west-2"
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
  vpc_cidr          = "10.0.0.0/16"
}

# Requirement: System Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: VPC module for network infrastructure
module "vpc" {
  source = "../modules/vpc"

  environment          = local.environment
  vpc_cidr            = local.vpc_cidr
  availability_zones  = local.availability_zones
  enable_dns_hostnames = true
  enable_dns_support   = true
  project_name        = "pantrychef"
}

# Requirement: System Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: API Gateway module for request handling and security
module "api_gateway" {
  source = "../modules/api-gateway"

  environment         = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  
  # Security features
  enable_waf          = true
  enable_vpc_link     = true
  rate_limit          = 1000
  burst_limit         = 2000
  
  # Monitoring and performance
  enable_xray         = true
  enable_cache        = true
  cache_size          = "0.5"
  enable_access_logs  = true
  
  # Tags
  tags = {
    Service = "API Gateway"
  }
}

# Requirement: System Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: ECS module for container orchestration
module "ecs" {
  source = "../modules/ecs"

  environment         = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  cluster_name       = "pantrychef"
  
  # Enable container insights for monitoring
  container_insights = true
  
  # Service resource allocations
  task_cpu_map = {
    api              = 2048
    image-processing = 4096
    worker           = 2048
  }
  
  task_memory_map = {
    api              = 4096
    image-processing = 8192
    worker           = 4096
  }
  
  # High availability configuration
  service_desired_count               = 2
  deployment_maximum_percent          = 200
  deployment_minimum_healthy_percent  = 100
  
  # Auto-scaling configuration
  autoscaling_max_capacity = 4
  autoscaling_min_capacity = 1
  health_check_grace_period = 60
}

# Requirement: Security Architecture
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: Export critical infrastructure values for reference
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "api_gateway_url" {
  description = "The URL of the API Gateway"
  value       = module.api_gateway.api_gateway_invoke_url
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = module.ecs.cluster_name
}