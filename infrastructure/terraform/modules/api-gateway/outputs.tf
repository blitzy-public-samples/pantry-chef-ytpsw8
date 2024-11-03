# Requirement: API Gateway Integration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Expose API Gateway ID for resource referencing and integration
output "api_gateway_id" {
  description = "The ID of the REST API Gateway for resource referencing"
  value       = aws_api_gateway_rest_api.main.id
}

# Requirement: High Availability Architecture
# Location: 10. INFRASTRUCTURE/10.2.2 High Availability Architecture
# Description: Expose stage name for environment-specific routing
output "api_gateway_stage_name" {
  description = "The name of the API Gateway stage (environment) for environment-specific routing"
  value       = aws_api_gateway_stage.main.stage_name
}

# Requirement: API Gateway Integration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Expose invoke URL for client application integration
output "api_gateway_invoke_url" {
  description = "The URL to invoke the API Gateway endpoints for client application integration"
  value       = aws_api_gateway_stage.main.invoke_url
}

# Requirement: Security Implementation
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols
# Description: Expose execution ARN for Lambda permission configurations
output "api_gateway_execution_arn" {
  description = "The execution ARN to be used in Lambda permission configurations and IAM policies"
  value       = aws_api_gateway_stage.main.execution_arn
}

# Requirement: API Gateway Integration
# Location: 5. SYSTEM ARCHITECTURE/5.1 High-Level Architecture Overview
# Description: Expose API endpoint for direct API access
output "api_gateway_endpoint" {
  description = "The endpoint URL of the REST API for direct API access"
  value       = aws_api_gateway_rest_api.main.api_endpoint
}