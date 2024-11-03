# Human Tasks:
# 1. Ensure that the AWS provider is configured with appropriate credentials
# 2. Verify that the ECS cluster name matches your naming convention
# 3. Confirm that all required services are included in the task_cpu_map variable

# Requirement: Container Orchestration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Output definitions for ECS cluster and service resources supporting microservices
output "cluster_id" {
  description = "The ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# Requirement: Service Integration
# Location: 10.4 Orchestration/10.4.1 ECS Configuration
# Description: Export service ARNs for cross-stack references and service discovery
output "service_arns" {
  description = "Map of service names to their ARNs"
  value = {
    for k, v in aws_ecs_service.services : k => v.arn
  }
}

# Requirement: High Availability
# Location: 10.1 Deployment Environment
# Description: Export task definition ARNs for deployment tracking and updates
output "task_definition_arns" {
  description = "Map of service names to their task definition ARNs"
  value = {
    for k, v in aws_ecs_task_definition.services : k => v.arn
  }
}

# Requirement: Container Orchestration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Export list of service names for service discovery and monitoring
output "service_names" {
  description = "List of all ECS service names"
  value       = [for service in aws_ecs_service.services : service.name]
}