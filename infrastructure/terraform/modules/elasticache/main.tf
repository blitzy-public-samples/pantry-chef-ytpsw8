# Human Tasks:
# 1. Ensure AWS provider is configured with appropriate permissions for ElastiCache management
# 2. Configure VPC security groups to allow Redis port access (default: 6379)
# 3. Set up CloudWatch alarms for cache monitoring using the exposed variables
# 4. Review maintenance window timing based on application usage patterns
# 5. Validate Redis parameter group settings align with application requirements

# Required providers with versions
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Cache Layer Implementation
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Redis parameter group configuration for performance optimization
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.parameter_family
  name        = "${var.cluster_id}-params"
  description = "Redis parameter group for PantryChef application"

  # Configure Redis parameters for optimal performance and reliability
  dynamic "parameter" {
    for_each = var.redis_parameters
    content {
      name  = parameter.key
      value = parameter.value
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.cluster_id}-params"
    Environment = var.environment
  })
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: ElastiCache subnet group for multi-AZ deployment
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.cluster_id}-subnet-group"
  subnet_ids = data.terraform_remote_state.vpc.outputs.private_subnet_ids

  tags = merge(var.tags, {
    Name        = "${var.cluster_id}-subnet-group"
    Environment = var.environment
  })
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Security group for Redis cluster access
resource "aws_security_group" "redis" {
  name        = "${var.cluster_id}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id

  ingress {
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = [data.terraform_remote_state.vpc.outputs.vpc_cidr_block]
    description = "Allow Redis port access within VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name        = "${var.cluster_id}-redis-sg"
    Environment = var.environment
  })
}

# Requirement: Cache Layer Implementation & High Availability Setup
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Redis replication group with automatic failover and multi-AZ deployment
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = var.cluster_id
  replication_group_description = "Redis cluster for PantryChef application"
  node_type                     = var.node_type
  port                         = var.port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  automatic_failover_enabled   = var.automatic_failover_enabled
  multi_az_enabled            = var.multi_az_enabled
  num_cache_clusters          = var.num_cache_clusters
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  maintenance_window          = var.maintenance_window
  snapshot_retention_limit    = var.snapshot_retention_limit
  engine                     = "redis"
  engine_version             = "6.x"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = merge(var.tags, {
    Name        = var.cluster_id
    Environment = var.environment
  })

  # Requirement: Resource Monitoring
  # Location: APPENDICES/C. SYSTEM METRICS
  # Description: Configure CloudWatch metrics and alarms
  lifecycle {
    prevent_destroy = true
  }
}

# Data source for VPC information
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "pantrychef-terraform-state"
    key    = "vpc/terraform.tfstate"
    region = "us-west-2"
  }
}

# Requirement: Resource Monitoring
# Location: APPENDICES/C. SYSTEM METRICS
# Description: CloudWatch alarm for cache memory utilization
resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.cluster_id}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = []  # Add SNS topic ARN for notifications
  ok_actions         = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(var.tags, {
    Name        = "${var.cluster_id}-memory-alarm"
    Environment = var.environment
  })
}

# Requirement: Resource Monitoring
# Location: APPENDICES/C. SYSTEM METRICS
# Description: CloudWatch alarm for cache CPU utilization
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.cluster_id}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "EngineCPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "70"
  alarm_actions      = []  # Add SNS topic ARN for notifications
  ok_actions         = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(var.tags, {
    Name        = "${var.cluster_id}-cpu-alarm"
    Environment = var.environment
  })
}