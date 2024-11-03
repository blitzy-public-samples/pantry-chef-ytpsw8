# Requirement: S3 Storage Integration
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Purpose: Expose S3 bucket configuration details for integration with CloudFront CDN and application services
output "bucket_id" {
  description = "The ID of the created S3 bucket for PantryChef image storage"
  value       = aws_s3_bucket.main.id
  sensitive   = false
}

output "bucket_arn" {
  description = "The ARN of the created S3 bucket for IAM policy attachments"
  value       = aws_s3_bucket.main.arn
  sensitive   = false
}

output "bucket_domain_name" {
  description = "The domain name of the created S3 bucket for CloudFront distribution configuration"
  value       = aws_s3_bucket.main.bucket_domain_name
  sensitive   = false
}

output "bucket_regional_domain_name" {
  description = "The regional domain name of the created S3 bucket for region-specific access"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
  sensitive   = false
}

# Requirement: High Availability Storage
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Purpose: Provide bucket information for cross-region replication configuration and disaster recovery setup
output "versioning_enabled" {
  description = "Indicates whether versioning is enabled on the bucket for data protection"
  value       = aws_s3_bucket_versioning.main.versioning_configuration[0].status
  sensitive   = false
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security/9.2.1 Encryption Standards
# Purpose: Export encryption configuration details for security compliance and monitoring
output "encryption_configuration" {
  description = "The server-side encryption configuration of the bucket (AES-256 or KMS)"
  value       = aws_s3_bucket_server_side_encryption_configuration.main.rule[0].apply_server_side_encryption_by_default.sse_algorithm
  sensitive   = false
}