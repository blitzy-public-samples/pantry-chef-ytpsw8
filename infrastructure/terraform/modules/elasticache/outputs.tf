# Requirement: Cache Layer Integration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Expose Redis cache connection details for backend services integration
output "redis_primary_endpoint" {
  description = "Primary endpoint for Redis cluster write operations"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# Requirement: High Availability Configuration
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Expose Redis reader endpoint for read replicas in multi-AZ setup
output "redis_reader_endpoint" {
  description = "Reader endpoint for Redis cluster read operations in multi-AZ setup"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

# Requirement: Cache Layer Integration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Expose Redis port for application connectivity
output "redis_port" {
  description = "Port number for Redis cluster connections"
  value       = aws_elasticache_replication_group.redis.port
}

# Requirement: Security Configuration
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: Expose security group ID for secure Redis access
output "redis_security_group_id" {
  description = "ID of the security group controlling Redis cluster access"
  value       = aws_security_group.redis.id
}

# Requirement: Cache Layer Integration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Expose Redis parameter group for configuration management
output "redis_parameter_group_name" {
  description = "Name of the Redis parameter group used by the cluster"
  value       = aws_elasticache_parameter_group.redis.name
}

# Requirement: High Availability Configuration
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Description: Expose subnet group for network configuration
output "redis_subnet_group_name" {
  description = "Name of the subnet group where Redis cluster is deployed"
  value       = aws_elasticache_subnet_group.redis.name
}