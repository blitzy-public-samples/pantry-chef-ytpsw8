# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Expose RabbitMQ connection details for application services to connect to the message queue
output "broker_id" {
  description = "ID of the RabbitMQ broker for resource referencing and monitoring"
  value       = aws_mq_broker.main.id
}

output "broker_arn" {
  description = "ARN of the RabbitMQ broker for IAM and resource policies"
  value       = aws_mq_broker.main.arn
}

# Requirement: High Availability
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Output multi-AZ RabbitMQ cluster endpoints for high availability and failover support
output "broker_endpoints" {
  description = "List of RabbitMQ broker endpoints for AMQP connections across availability zones"
  value       = aws_mq_broker.main.instances[*].endpoints
}

output "primary_endpoint" {
  description = "Primary endpoint of the RabbitMQ broker for initial connections"
  value       = aws_mq_broker.main.instances[0].endpoints[0]
}

# Requirement: Message Queue Infrastructure
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Expose security configurations for network access control
output "security_group_id" {
  description = "ID of the security group attached to the RabbitMQ broker for network access control"
  value       = aws_security_group.rabbitmq.id
}