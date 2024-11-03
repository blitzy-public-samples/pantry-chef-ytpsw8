# Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Requirement: Cloud Infrastructure
# Location: 10. INFRASTRUCTURE/10.1 Deployment Environment
# Description: AWS VPC infrastructure supporting production environment with proper network segmentation
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = {
    Name        = "${var.project_name}-vpc-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Internet Gateway for secure public subnet internet access
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-igw-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Public subnets across multiple AZs for high availability
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-public-subnet-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Project     = var.project_name
    Type        = "Public"
    ManagedBy   = "terraform"
  }
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Private subnets for secure application and database deployment
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.project_name}-private-subnet-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Project     = var.project_name
    Type        = "Private"
    ManagedBy   = "terraform"
  }
}

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: Elastic IPs for NAT Gateways in each AZ
resource "aws_eip" "nat" {
  count = length(var.availability_zones)
  vpc   = true

  tags = {
    Name        = "${var.project_name}-eip-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# Requirement: High Availability Architecture
# Location: 5. SYSTEM ARCHITECTURE/5.5 Deployment Architecture
# Description: NAT Gateways for private subnet internet access in each AZ
resource "aws_nat_gateway" "main" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "${var.project_name}-nat-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Route table for public subnets with internet access
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.project_name}-public-rt-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Type        = "Public"
    ManagedBy   = "terraform"
  }
}

# Requirement: Network Security
# Location: 9. SECURITY CONSIDERATIONS/9.3 Security Protocols/9.3.1 Access Control Measures
# Description: Route tables for private subnets with NAT gateway routes
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name        = "${var.project_name}-private-rt-${var.environment}-${count.index + 1}"
    Environment = var.environment
    Project     = var.project_name
    Type        = "Private"
    ManagedBy   = "terraform"
  }
}

# Public subnet route table associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private subnet route table associations
resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}