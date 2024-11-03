# Requirement: Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: Outputs AWS VPC infrastructure components for production environment deployment
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Exposes VPC CIDR block for network planning and security group configuration
output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Exposes public subnet IDs for load balancer and NAT gateway configuration
output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Exposes private subnet IDs for application and database resource configuration
output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Exposes list of availability zones used for multi-AZ deployment configuration
output "availability_zones" {
  description = "List of availability zones used for VPC resources"
  value       = var.availability_zones
}