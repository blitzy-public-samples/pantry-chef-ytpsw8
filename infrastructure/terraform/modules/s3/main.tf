# HUMAN TASKS:
# 1. Review and adjust KMS key configurations for each environment if custom encryption is needed
# 2. Configure CORS rules based on specific frontend domain requirements
# 3. Review and adjust lifecycle rules based on data retention requirements
# 4. Verify replication region settings comply with data residency requirements
# 5. Ensure public access settings align with security policies

# Requirement: Image Storage
# Location: 7. TECHNOLOGY STACK/7.3 Databases and Storage
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

# Main S3 bucket for storing application images and static assets
resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name
  
  tags = merge({
    Name        = var.bucket_name
    Environment = terraform.workspace
    Service     = "PantryChef-Storage"
  }, var.common_tags)
}

# Requirement: Data Security
# Location: 9. SECURITY CONSIDERATIONS/9.2 Data Security/9.2.1 Encryption Standards
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Disabled"
  }
}

# Configure server-side encryption for data protection
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn
    }
  }
}

# Configure lifecycle rules for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.name
      status = rule.value.enabled ? "Enabled" : "Disabled"

      expiration {
        days = rule.value.expiration_days
      }
    }
  }
}

# Configure CORS for web application access
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    content {
      allowed_headers = cors_rule.value.allowed_headers
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = cors_rule.value.expose_headers
      max_age_seconds = cors_rule.value.max_age_seconds
    }
  }
}

# Requirement: High Availability Storage
# Location: 10. INFRASTRUCTURE/10.2 Cloud Services/10.2.1 AWS Service Stack
# Create replica bucket for cross-region replication
resource "aws_s3_bucket" "replica" {
  count  = var.enable_replication ? 1 : 0
  bucket = "${var.bucket_name}-replica"
  provider = aws.replica

  tags = merge({
    Name        = "${var.bucket_name}-replica"
    Environment = terraform.workspace
    Service     = "PantryChef-Storage-Replica"
  }, var.common_tags)
}

# Configure replication role
resource "aws_iam_role" "replication" {
  count = var.enable_replication ? 1 : 0
  name  = "${var.bucket_name}-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

# Configure replication policy
resource "aws_iam_role_policy" "replication" {
  count = var.enable_replication ? 1 : 0
  name  = "${var.bucket_name}-replication-policy"
  role  = aws_iam_role.replication[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.main.arn
        ]
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.main.arn}/*"
        ]
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect = "Allow"
        Resource = [
          "${aws_s3_bucket.replica[0].arn}/*"
        ]
      }
    ]
  })
}

# Configure cross-region replication
resource "aws_s3_bucket_replication_configuration" "main" {
  count  = var.enable_replication ? 1 : 0
  bucket = aws_s3_bucket.main.id
  role   = aws_iam_role.replication[0].arn

  rule {
    id     = "ReplicateAll"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica[0].arn
      storage_class = "STANDARD"
    }
  }

  depends_on = [aws_s3_bucket_versioning.main]
}

# Configure public access blocking for security
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = !var.public_access_enabled
  block_public_policy     = !var.public_access_enabled
  ignore_public_acls      = !var.public_access_enabled
  restrict_public_buckets = !var.public_access_enabled
}

# Configure replica bucket public access blocking
resource "aws_s3_bucket_public_access_block" "replica" {
  count  = var.enable_replication ? 1 : 0
  bucket = aws_s3_bucket.replica[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Output values for reference
output "bucket_id" {
  description = "The ID of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket_domain_name
}