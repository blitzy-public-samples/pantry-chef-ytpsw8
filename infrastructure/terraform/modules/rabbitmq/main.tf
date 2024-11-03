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
  default_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    Service     = "rabbitmq"
    CreatedAt   = timestamp()
    Component   = "message-queue"
  }

  # Ensure unique broker name with random suffix
  broker_name = "${var.project_name}-${var.environment}-rabbitmq-${random_id.suffix.hex}"
}

# Generate random suffix for unique resource naming
resource "random_id" "suffix" {
  byte_length = 4
}

# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Security group for RabbitMQ access control
resource "aws_security_group" "rabbitmq" {
  name        = "${var.project_name}-${var.environment}-rabbitmq-sg"
  description = "Security group for RabbitMQ broker access"
  vpc_id      = var.vpc_id

  # AMQP over TLS
  ingress {
    from_port       = 5671
    to_port         = 5671
    protocol        = "tcp"
    cidr_blocks     = length(var.allowed_cidr_blocks) > 0 ? var.allowed_cidr_blocks : [data.aws_vpc.selected.cidr_block]
    description     = "AMQP over TLS"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, local.default_tags)
}

# Get VPC details for default CIDR block
data "aws_vpc" "selected" {
  id = var.vpc_id
}

# Requirement: High Availability
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: RabbitMQ broker with multi-AZ deployment
resource "aws_mq_broker" "main" {
  broker_name        = local.broker_name
  engine_type        = "RabbitMQ"
  engine_version     = var.engine_version
  host_instance_type = var.instance_type
  deployment_mode    = var.deployment_mode
  subnet_ids         = var.subnet_ids
  security_groups    = [aws_security_group.rabbitmq.id]

  maintenance_window_start_time {
    day_of_week = var.maintenance_window_start_time.day_of_week
    time_of_day = var.maintenance_window_start_time.time_of_day
    time_zone   = var.maintenance_window_start_time.time_zone
  }

  logs {
    general = true
    audit   = true
  }

  encryption_options {
    use_aws_owned_key = true
  }

  auto_minor_version_upgrade = true
  publicly_accessible       = false

  tags = merge(var.tags, local.default_tags)
}

# Requirement: System Monitoring
# Location: 10. INFRASTRUCTURE/10.5.3 Monitoring and Rollback
# Description: CloudWatch alarms for RabbitMQ monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${local.broker_name}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.cloudwatch_alarm_config.evaluation_periods
  metric_name         = "CpuUtilization"
  namespace           = "AWS/AmazonMQ"
  period             = var.cloudwatch_alarm_config.period
  statistic          = "Average"
  threshold          = var.cloudwatch_alarm_config.threshold
  alarm_description  = "Monitor RabbitMQ broker CPU utilization"

  dimensions = {
    Broker = aws_mq_broker.main.id
  }

  alarm_actions             = [var.alarm_topic_arn]
  ok_actions               = [var.alarm_topic_arn]
  insufficient_data_actions = [var.alarm_topic_arn]

  tags = merge(var.tags, local.default_tags)
}

resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  alarm_name          = "${local.broker_name}-memory-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.cloudwatch_alarm_config.evaluation_periods
  metric_name         = "MemoryUsed"
  namespace           = "AWS/AmazonMQ"
  period             = var.cloudwatch_alarm_config.period
  statistic          = "Average"
  threshold          = var.cloudwatch_alarm_config.threshold
  alarm_description  = "Monitor RabbitMQ broker memory usage"

  dimensions = {
    Broker = aws_mq_broker.main.id
  }

  alarm_actions             = [var.alarm_topic_arn]
  ok_actions               = [var.alarm_topic_arn]
  insufficient_data_actions = [var.alarm_topic_arn]

  tags = merge(var.tags, local.default_tags)
}

resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  alarm_name          = "${local.broker_name}-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.cloudwatch_alarm_config.evaluation_periods
  metric_name         = "QueueDepth"
  namespace           = "AWS/AmazonMQ"
  period             = var.cloudwatch_alarm_config.period
  statistic          = "Average"
  threshold          = var.cloudwatch_alarm_config.threshold * 1000 # Convert to number of messages
  alarm_description  = "Monitor RabbitMQ broker queue depth"

  dimensions = {
    Broker = aws_mq_broker.main.id
  }

  alarm_actions             = [var.alarm_topic_arn]
  ok_actions               = [var.alarm_topic_arn]
  insufficient_data_actions = [var.alarm_topic_arn]

  tags = merge(var.tags, local.default_tags)
}

# Outputs for use in other modules
output "broker_id" {
  description = "RabbitMQ broker ID"
  value       = aws_mq_broker.main.id
}

output "broker_endpoints" {
  description = "RabbitMQ connection endpoints"
  value       = aws_mq_broker.main.instances[*].endpoints
}

output "security_group_id" {
  description = "Security group ID for RabbitMQ broker"
  value       = aws_security_group.rabbitmq.id
}