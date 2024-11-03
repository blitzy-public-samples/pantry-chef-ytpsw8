# Provider version constraints
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Container Orchestration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Main ECS cluster configuration for PantryChef microservices
resource "aws_ecs_cluster" "main" {
  name = "${var.cluster_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = var.container_insights ? "enabled" : "disabled"
  }

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base            = 1
  }

  tags = {
    Environment = var.environment
    Project     = "PantryChef"
    ManagedBy   = "Terraform"
  }
}

# Requirement: High Availability
# Location: 10.1 Deployment Environment
# Description: Security group for ECS tasks with controlled network access
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.cluster_name}-${var.environment}-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound traffic between services"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.cluster_name}-${var.environment}-tasks-sg"
    Environment = var.environment
  }
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: IAM role for ECS task execution
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.cluster_name}-${var.environment}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Task definitions for each microservice with specific resource allocations
resource "aws_ecs_task_definition" "services" {
  for_each = var.task_cpu_map

  family                   = "${each.key}-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = each.value
  memory                  = var.task_memory_map[each.key]
  execution_role_arn      = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = each.key
      image = "${each.key}:latest" # Actual image URL should be provided through CI/CD
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.cluster_name}-${var.environment}/${each.key}"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    Service     = each.key
  }
}

# Requirement: High Availability
# Location: 10.1 Deployment Environment
# Description: ECS services with high availability and auto-scaling configurations
resource "aws_ecs_service" "services" {
  for_each = var.task_cpu_map

  name            = "${each.key}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  deployment_controller {
    type = "ECS"
  }

  deployment_maximum_percent         = var.deployment_maximum_percent
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  health_check_grace_period_seconds = var.health_check_grace_period

  tags = {
    Environment = var.environment
    Service     = each.key
  }
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Auto-scaling targets for ECS services
resource "aws_appautoscaling_target" "ecs_target" {
  for_each = var.task_cpu_map

  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: CPU-based auto-scaling policy
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  for_each = var.task_cpu_map

  name               = "${each.key}-${var.environment}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Requirement: Service Scaling
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Memory-based auto-scaling policy
resource "aws_appautoscaling_policy" "ecs_policy_memory" {
  for_each = var.task_cpu_map

  name               = "${each.key}-${var.environment}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

# Get current AWS region
data "aws_region" "current" {}

# Create CloudWatch log groups for each service
resource "aws_cloudwatch_log_group" "ecs_services" {
  for_each = var.task_cpu_map

  name              = "/ecs/${var.cluster_name}-${var.environment}/${each.key}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Service     = each.key
  }
}