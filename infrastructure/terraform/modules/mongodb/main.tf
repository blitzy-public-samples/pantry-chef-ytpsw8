# Provider versions
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

# Local variables for resource naming and tagging
locals {
  cluster_name = "${var.project_name}-${var.environment}-mongodb"
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  )
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: KMS key for MongoDB storage encryption
resource "aws_kms_key" "mongodb" {
  description             = "KMS key for MongoDB storage encryption"
  deletion_window_in_days = 7
  enable_key_rotation    = true
  tags                   = local.common_tags
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Security group for MongoDB cluster access control
resource "aws_security_group" "mongodb" {
  name        = "${local.cluster_name}-sg"
  description = "Security group for MongoDB cluster"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "MongoDB access from allowed CIDR blocks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = local.common_tags
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Subnet group for multi-AZ MongoDB deployment
resource "aws_docdb_subnet_group" "mongodb" {
  name        = "${local.cluster_name}-subnet-group"
  description = "Subnet group for MongoDB cluster"
  subnet_ids  = data.aws_vpc.selected.private_subnet_ids

  tags = local.common_tags
}

# Requirement: Primary Database
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Random password generation for MongoDB master user
resource "random_password" "master_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: MongoDB-compatible DocumentDB cluster configuration
resource "aws_docdb_cluster" "mongodb" {
  cluster_identifier              = local.cluster_name
  engine                         = "docdb"
  engine_version                 = var.engine_version
  master_username                = "administrator"
  master_password                = random_password.master_password.result
  backup_retention_period        = var.backup_retention_period
  preferred_backup_window        = var.backup_window
  preferred_maintenance_window   = var.maintenance_window
  skip_final_snapshot           = var.skip_final_snapshot
  final_snapshot_identifier     = var.skip_final_snapshot ? null : "${local.cluster_name}-final-snapshot"
  storage_encrypted             = var.storage_encrypted
  kms_key_id                    = var.storage_encrypted ? aws_kms_key.mongodb.arn : null
  vpc_security_group_ids        = [aws_security_group.mongodb.id]
  db_subnet_group_name          = aws_docdb_subnet_group.mongodb.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.mongodb.name

  tags = local.common_tags
}

# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: MongoDB cluster instances across availability zones
resource "aws_docdb_cluster_instance" "mongodb" {
  count              = var.cluster_size
  identifier         = "${local.cluster_name}-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.mongodb.id
  instance_class     = var.instance_class

  auto_minor_version_upgrade = true
  preferred_maintenance_window = var.maintenance_window
  availability_zone         = element(data.aws_vpc.selected.availability_zones, count.index)

  tags = local.common_tags
}

# Requirement: Primary Database
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: MongoDB cluster parameter group for configuration
resource "aws_docdb_cluster_parameter_group" "mongodb" {
  family      = "docdb4.0"
  name        = "${local.cluster_name}-params"
  description = "DocDB cluster parameter group for ${local.cluster_name}"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  tags = local.common_tags
}

# Data source for VPC information
data "aws_vpc" "selected" {
  id = var.vpc_id
}

# Outputs for other modules to consume
output "cluster_endpoint" {
  description = "MongoDB cluster endpoint"
  value       = aws_docdb_cluster.mongodb.endpoint
}

output "cluster_port" {
  description = "MongoDB cluster port"
  value       = 27017
}

output "master_username" {
  description = "MongoDB master username"
  value       = aws_docdb_cluster.mongodb.master_username
  sensitive   = true
}

output "connection_string" {
  description = "MongoDB connection string (without password)"
  value       = "mongodb://${aws_docdb_cluster.mongodb.master_username}:@${aws_docdb_cluster.mongodb.endpoint}:27017/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred"
  sensitive   = true
}