<!-- Human Tasks:
1. Ensure Jenkins CI/CD pipeline is properly configured to run all required tests
2. Verify AWS security group permissions are set up for any new services
3. Confirm Kubernetes manifests are updated if adding new microservices
4. Check that monitoring alerts are configured for new components
5. Validate that proper access roles are created in IAM if needed
-->

## Description
<!-- Required: Provide a comprehensive description of your changes -->
### Summary of changes
- 

### Related issue number
- 

### Type of change
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Performance
- [ ] Security

### Affected components
- [ ] API Gateway
- [ ] Application Services
- [ ] Message Queue (RabbitMQ)
- [ ] Cache Layer (Redis)
- [ ] Data Layer (MongoDB/Elasticsearch)
- [ ] External Services

### Impact on system architecture
- 

### Dependencies affected
- 

## Changes Made
<!-- Required: Detail the technical implementation -->
### Technical changes made
- 

### Architecture impact on microservices
- 

### Database schema changes
- MongoDB:
- Elasticsearch:
- Redis:

### API contract changes
- REST endpoints:
- WebSocket events:

### Message queue topology changes
- RabbitMQ exchanges:
- Queue bindings:

### Cache invalidation strategy changes
- 

### Security considerations
- JWT/OAuth:
- Encryption:
- TLS:
- VPC/Network:

### Infrastructure changes
- AWS resources:
- Kubernetes manifests:
- Terraform changes:

### Mobile platform impacts
- iOS:
- Android:

### Web application impacts
- React/Next.js changes:

## Testing
<!-- Required: Document all testing performed -->
### Unit tests added/modified
- 

### Integration tests across services
- 

### E2E tests for affected flows
- 

### Performance test results
- Latency:
- Throughput:
- Resource utilization:

### Security test results
- SAST scan:
- Container scan:
- Dependency scan:

### Mobile platform test results
- iOS test results:
- Android test results:

### Web platform test results
- Browser compatibility:
- Accessibility tests:

### Manual testing steps
1. 
2. 
3. 

### Load testing results
- 

### Rollback procedure verified
- [ ] Rollback steps documented
- [ ] Rollback tested

## Review Checklist
<!-- Required: Mark all applicable items -->
- [ ] Code follows architectural patterns and style guidelines
- [ ] API documentation updated (Swagger/OpenAPI)
- [ ] Technical documentation updated
- [ ] Database migration scripts provided
- [ ] All tests passing in CI pipeline
- [ ] Security review completed
  - [ ] JWT/OAuth implementation verified
  - [ ] Encryption standards met
  - [ ] TLS 1.3 enforced
  - [ ] VPC security reviewed
- [ ] Performance impact assessed
  - [ ] Latency requirements met
  - [ ] Resource utilization acceptable
- [ ] Breaking changes documented
- [ ] Monitoring and logging added
  - [ ] CloudWatch metrics
  - [ ] Log aggregation
- [ ] Error handling implemented
  - [ ] Graceful degradation
  - [ ] Retry mechanisms
- [ ] Rate limiting considered
- [ ] Cache strategy documented
- [ ] AWS resource changes reviewed
  - [ ] IAM roles/policies
  - [ ] Security groups
  - [ ] Resource scaling
- [ ] Kubernetes manifests updated if needed
- [ ] Mobile platform guidelines followed
  - [ ] iOS design patterns
  - [ ] Android design patterns
- [ ] Web accessibility standards met
  - [ ] WCAG 2.1 compliance
  - [ ] Screen reader support
- [ ] GDPR/CCPA compliance verified
  - [ ] Data handling
  - [ ] User consent
  - [ ] Data retention