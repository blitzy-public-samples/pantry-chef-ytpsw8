# Provider configuration for AWS with required version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: API Gateway Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Primary REST API Gateway configuration for PantryChef application
resource "aws_api_gateway_rest_api" "main" {
  name        = var.api_name
  description = "PantryChef API Gateway for mobile and web clients"

  endpoint_configuration {
    types = [var.endpoint_type]
  }

  binary_media_types = ["multipart/form-data", "image/*"]
  minimum_compression_size = var.minimum_compression_size
  api_key_source = "HEADER"

  tags = merge(var.tags, {
    Environment = var.environment
    Name        = "${var.project_name}-api-${var.environment}"
  })
}

# Requirement: Security Implementation
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: CloudWatch log group for API Gateway access logging
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2.2 High Availability Architecture
# Description: API Gateway deployment configuration for version management
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  depends_on  = [aws_api_gateway_rest_api.main]

  lifecycle {
    create_before_destroy = true
  }

  triggers = {
    redeployment = sha1(jsonencode(aws_api_gateway_rest_api.main))
  }
}

# Requirement: API Gateway Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: API Gateway stage configuration with monitoring and logging
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id  = aws_api_gateway_rest_api.main.id
  stage_name   = var.environment

  cache_cluster_enabled = var.enable_cache
  cache_cluster_size   = var.cache_size
  xray_tracing_enabled = var.enable_xray

  dynamic "access_log_settings" {
    for_each = var.enable_access_logs ? [1] : []
    content {
      destination_arn = aws_cloudwatch_log_group.api_gateway.arn
      format = jsonencode({
        requestId       = "$context.requestId"
        ip             = "$context.identity.sourceIp"
        caller         = "$context.identity.caller"
        user           = "$context.identity.user"
        requestTime    = "$context.requestTime"
        httpMethod     = "$context.httpMethod"
        resourcePath   = "$context.resourcePath"
        status         = "$context.status"
        protocol       = "$context.protocol"
        responseLength = "$context.responseLength"
      })
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Requirement: Security Implementation
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: API Gateway method settings for throttling and monitoring
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level         = "INFO"
    data_trace_enabled    = true
    throttling_burst_limit = var.burst_limit
    throttling_rate_limit  = var.rate_limit
  }
}

# Requirement: Security Implementation
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: WAF Web ACL for API Gateway protection
resource "aws_wafv2_web_acl" "api_gateway" {
  count = var.enable_waf ? 1 : 0

  name        = "${var.project_name}-api-waf-${var.environment}"
  description = "WAF Web ACL for API Gateway protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "${var.project_name}-api-waf-${var.environment}"
    sampled_requests_enabled  = true
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Requirement: Security Implementation
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: WAF Web ACL association with API Gateway stage
resource "aws_wafv2_web_acl_association" "api_gateway" {
  count = var.enable_waf ? 1 : 0

  resource_arn = aws_api_gateway_stage.main.arn
  web_acl_arn  = aws_wafv2_web_acl.api_gateway[0].arn
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2.2 High Availability Architecture
# Description: Internal Application Load Balancer for VPC Link integration
resource "aws_lb" "internal" {
  count = var.enable_vpc_link ? 1 : 0

  name               = "${var.project_name}-internal-${var.environment}"
  internal           = true
  load_balancer_type = "network"
  subnets           = var.private_subnet_ids

  enable_deletion_protection = var.environment == "prod"

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Requirement: High Availability Setup
# Location: 10. INFRASTRUCTURE/10.2.2 High Availability Architecture
# Description: VPC Link for private integration with backend services
resource "aws_api_gateway_vpc_link" "main" {
  count = var.enable_vpc_link ? 1 : 0

  name        = "${var.project_name}-vpc-link-${var.environment}"
  target_arns = [aws_lb.internal[0].arn]
  
  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Requirement: API Gateway Configuration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: API Gateway usage plan for rate limiting and quota management
resource "aws_api_gateway_usage_plan" "main" {
  name        = "${var.project_name}-usage-plan-${var.environment}"
  description = "Usage plan for API Gateway rate limiting and quotas"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  throttle_settings {
    burst_limit = var.burst_limit
    rate_limit  = var.rate_limit
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}