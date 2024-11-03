# Requirement: High Availability Database
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture/Database Cluster
# Description: Expose MongoDB cluster endpoint for high availability setup
output "cluster_endpoint" {
  description = "MongoDB-compatible DocumentDB cluster endpoint URL for application access"
  value       = aws_docdb_cluster.mongodb.endpoint
  sensitive   = false
}

# Requirement: Database Integration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Expose MongoDB cluster port for backend service connections
output "cluster_port" {
  description = "MongoDB cluster port number (27017)"
  value       = 27017
  sensitive   = false
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: Expose security group ID for secure network access control
output "security_group_id" {
  description = "ID of the security group controlling network access to MongoDB cluster"
  value       = aws_security_group.mongodb.id
  sensitive   = false
}

# Requirement: Database Integration
# Location: 5. SYSTEM ARCHITECTURE/5.3 Technology Stack Details/5.3.2 Backend Stack
# Description: Expose MongoDB cluster identifier for resource management
output "cluster_name" {
  description = "MongoDB cluster identifier for resource tracking"
  value       = aws_docdb_cluster.mongodb.cluster_identifier
  sensitive   = false
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security
# Description: Expose secure connection string template for application authentication
output "connection_string" {
  description = "Template MongoDB connection string for secure application authentication"
  value       = format(
    "mongodb://%s:@%s:%d/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred",
    aws_docdb_cluster.mongodb.master_username,
    aws_docdb_cluster.mongodb.endpoint,
    27017
  )
  sensitive = true
}