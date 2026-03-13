# ==============================================================================
# OpenQHSE — AWS Infrastructure (Terraform)
# ==============================================================================
# Resources:
#   • VPC (3 public + 3 private subnets, NAT Gateway)
#   • EKS cluster (managed node groups, IRSA)
#   • RDS PostgreSQL (Multi-AZ)
#   • ElastiCache Redis (cluster mode)
#   • ECR repositories (api, web, ai-engine)
#   • S3 + CloudFront (media storage + CDN)
#   • Route53 DNS records
#   • ACM certificate
#   • IAM roles & policies
# ==============================================================================

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Store state in S3 (bootstrap the bucket manually once)
  backend "s3" {
    bucket         = "openqhse-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "openqhse-terraform-lock"
  }
}

# ==============================================================================
# Providers
# ==============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "OpenQHSE"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = "github.com/openqhse/platform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_ca_certificate)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ==============================================================================
# Locals
# ==============================================================================

locals {
  name   = "openqhse-${var.environment}"
  region = var.aws_region

  azs = slice(data.aws_availability_zones.available.names, 0, 3)

  vpc_cidr       = "10.0.0.0/16"
  public_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets= ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  eks_cluster_name = "${local.name}-eks"

  ecr_repos = ["openqhse-api", "openqhse-web", "openqhse-ai-engine"]

  common_tags = {
    Project     = "OpenQHSE"
    Environment = var.environment
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# ==============================================================================
# VPC
# ==============================================================================

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, { Name = "${local.name}-vpc" })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.common_tags, { Name = "${local.name}-igw" })
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name                                              = "${local.name}-public-${count.index + 1}"
    "kubernetes.io/role/elb"                          = "1"
    "kubernetes.io/cluster/${local.eks_cluster_name}" = "shared"
  })
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name                                              = "${local.name}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb"                = "1"
    "kubernetes.io/cluster/${local.eks_cluster_name}" = "shared"
  })
}

resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"
  tags   = merge(local.common_tags, { Name = "${local.name}-nat-eip" })
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.main]
  tags          = merge(local.common_tags, { Name = "${local.name}-nat" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.common_tags, { Name = "${local.name}-rt-public" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = merge(local.common_tags, { Name = "${local.name}-rt-private" })
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ==============================================================================
# ECR Repositories
# ==============================================================================

resource "aws_ecr_repository" "repos" {
  for_each             = toset(local.ecr_repos)
  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = var.environment != "production"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, { Name = each.value })
}

resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ==============================================================================
# EKS Cluster
# ==============================================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.eks_cluster_name
  cluster_version = var.eks_version

  vpc_id                   = aws_vpc.main.id
  subnet_ids               = aws_subnet.private[*].id
  control_plane_subnet_ids = aws_subnet.private[*].id

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  # Node groups
  eks_managed_node_groups = {
    general = {
      name           = "${local.name}-ng-general"
      instance_types = [var.eks_node_instance_type]
      min_size       = 2
      max_size       = 8
      desired_size   = 3

      ami_type       = "AL2_x86_64"
      capacity_type  = "ON_DEMAND"

      disk_size = 50

      labels = {
        role = "general"
      }

      tags = local.common_tags
    }

    compute = {
      name           = "${local.name}-ng-compute"
      instance_types = ["c6i.xlarge"]
      min_size       = 1
      max_size       = 5
      desired_size   = 1

      ami_type  = "AL2_x86_64"
      capacity_type = "SPOT"

      labels = {
        role = "compute"
      }

      taints = [{
        key    = "compute"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]

      tags = local.common_tags
    }
  }

  # OIDC provider for IRSA
  enable_irsa = true

  # Cluster addons
  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
    aws-ebs-csi-driver     = { most_recent = true }
  }

  tags = local.common_tags
}

# ==============================================================================
# RDS — PostgreSQL (Multi-AZ)
# ==============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
  tags       = merge(local.common_tags, { Name = "${local.name}-db-subnet" })
}

resource "aws_security_group" "rds" {
  name   = "${local.name}-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [local.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name}-rds-sg" })
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name}-postgres"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.rds_instance_class

  db_name  = "openqhse"
  username = "openqhse"
  password = random_password.db_password.result

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  multi_az               = var.environment == "production"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period    = var.environment == "production" ? 7 : 1
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true
  deletion_protection        = var.environment == "production"
  skip_final_snapshot        = var.environment != "production"
  final_snapshot_identifier  = var.environment == "production" ? "${local.name}-final-snapshot" : null

  performance_insights_enabled = true

  tags = merge(local.common_tags, { Name = "${local.name}-postgres" })
}

# ==============================================================================
# ElastiCache — Redis
# ==============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "redis" {
  name   = "${local.name}-redis-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [local.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name}-redis-sg" })
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name}-redis"
  description          = "OpenQHSE Redis cluster"

  node_type            = var.redis_node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"

  tags = merge(local.common_tags, { Name = "${local.name}-redis" })
}

# ==============================================================================
# S3 — Media storage
# ==============================================================================

resource "aws_s3_bucket" "media" {
  bucket = "${local.name}-media-${data.aws_caller_identity.current.account_id}"
  tags   = merge(local.common_tags, { Name = "${local.name}-media" })
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ==============================================================================
# ACM Certificate
# ==============================================================================

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, { Name = "${local.name}-cert" })
}

# ==============================================================================
# Secrets Manager
# ==============================================================================

resource "aws_secretsmanager_secret" "api" {
  name                    = "${local.name}/api"
  description             = "OpenQHSE API secrets"
  recovery_window_in_days = var.environment == "production" ? 7 : 0
  tags                    = local.common_tags
}

resource "aws_secretsmanager_secret_version" "api" {
  secret_id = aws_secretsmanager_secret.api.id
  secret_string = jsonencode({
    DATABASE_URL   = "postgresql+asyncpg://openqhse:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/openqhse"
    REDIS_URL      = "rediss://:@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379/0"
    SECRET_KEY     = random_password.db_password.result  # Replace with real key in prod
    OPENAI_API_KEY = ""  # Set manually
    S3_BUCKET      = aws_s3_bucket.media.bucket
    S3_REGION      = var.aws_region
  })
}

# ==============================================================================
# Outputs
# ==============================================================================

output "vpc_id"                 { value = aws_vpc.main.id }
output "eks_cluster_name"       { value = module.eks.cluster_name }
output "eks_cluster_endpoint"   { value = module.eks.cluster_endpoint }
output "ecr_registry"           { value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com" }
output "rds_endpoint"           { value = aws_db_instance.main.endpoint }
output "redis_endpoint"         { value = aws_elasticache_replication_group.main.primary_endpoint_address }
output "s3_media_bucket"        { value = aws_s3_bucket.media.bucket }
output "acm_certificate_arn"    { value = aws_acm_certificate.main.arn }
output "secrets_manager_arn"    { value = aws_secretsmanager_secret.api.arn }
