# HUMAN TASKS:
# 1. Review and adjust instance types based on workload requirements per environment
# 2. Verify backup window aligns with organizational backup policies
# 3. Monitor CloudWatch metrics for CPU and Memory thresholds
# 4. Ensure proper IAM roles and policies are configured for ES access
# 5. Configure Elasticsearch security settings in application after deployment

# Required provider versions
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws" # version ~> 4.0
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random" # version ~> 3.0
      version = "~> 3.0"
    }
  }
}

# Requirement: Get current AWS account and region details
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Requirement: Generate unique domain name
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details
resource "random_id" "domain_suffix" {
  byte_length = 4
  prefix      = "${var.environment}-pantrychef-es-"
}

# Requirement: Common resource tagging
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
locals {
  common_tags = {
    Environment = var.environment
    Service     = "elasticsearch"
    ManagedBy   = "terraform"
  }
}

# Requirement: Security group for Elasticsearch
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
resource "aws_security_group" "es_sg" {
  name        = "${var.environment}-es-sg"
  description = "Security group for Elasticsearch domain"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [] # Will be managed by application security groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-es-sg"
    }
  )
}

# Requirement: Elasticsearch domain configuration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
resource "aws_elasticsearch_domain" "main" {
  domain_name           = random_id.domain_suffix.hex
  elasticsearch_version = var.elasticsearch_version

  # Requirement: High Availability Architecture
  # Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
  cluster_config {
    instance_type            = var.instance_type
    instance_count          = var.instance_count
    zone_awareness_enabled  = true
    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  # Requirement: System Metrics - Storage Configuration
  # Location: APPENDICES/C. SYSTEM METRICS
  ebs_options {
    ebs_enabled = true
    volume_size = var.volume_size
    volume_type = "gp3"
  }

  # Requirement: High Availability Architecture - Network Configuration
  # Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
  vpc_options {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.es_sg.id]
  }

  # Requirement: Data Security - Encryption Configuration
  # Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # Requirement: Infrastructure Configuration - Backup Settings
  # Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
  snapshot_options {
    automated_snapshot_start_hour = var.automated_snapshot_start_hour
  }

  # Requirement: Advanced Security Options
  # Location: 9. SECURITY CONSIDERATIONS/9.1 Authentication and Authorization
  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "admin"
      master_user_password = random_password.master_password.result
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-elasticsearch"
    }
  )
}

# Requirement: Secure master user password generation
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
resource "random_password" "master_password" {
  length  = 16
  special = true
}

# Requirement: Elasticsearch endpoint exposure
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details
output "endpoint" {
  description = "Elasticsearch domain endpoint"
  value       = aws_elasticsearch_domain.main.endpoint
}

# Requirement: Elasticsearch ARN exposure
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
output "arn" {
  description = "Elasticsearch domain ARN"
  value       = aws_elasticsearch_domain.main.arn
}