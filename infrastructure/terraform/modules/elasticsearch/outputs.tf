# Requirement: Search Engine Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Expose Elasticsearch endpoint for recipe and ingredient search functionality
output "elasticsearch_endpoint" {
  description = "Endpoint URL of the Elasticsearch domain for recipe and ingredient search service connectivity"
  value       = aws_elasticsearch_domain.main.endpoint
  sensitive   = false
}

# Requirement: High Availability Architecture
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
# Expose ARN for IAM policy attachment and resource management
output "elasticsearch_arn" {
  description = "ARN of the Elasticsearch domain for IAM policy attachment and resource management"
  value       = aws_elasticsearch_domain.main.arn
  sensitive   = false
}

# Requirement: High Availability Architecture
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.2 High Availability Architecture
# Expose domain ID for resource referencing and monitoring
output "elasticsearch_domain_id" {
  description = "ID of the Elasticsearch domain for resource referencing and monitoring"
  value       = aws_elasticsearch_domain.main.domain_id
  sensitive   = false
}

# Requirement: Search Engine Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Expose security group ID for VPC network security configuration
output "elasticsearch_security_group_id" {
  description = "ID of the Elasticsearch security group for VPC network security configuration"
  value       = aws_security_group.es_sg.id
  sensitive   = false
}