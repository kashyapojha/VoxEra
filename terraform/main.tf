# ── VoIPSight AWS Infrastructure ──
# Provisions: EC2, Security Group, ECR repos, Key Pair
# Region: ap-south-1 (Mumbai — closest to India)

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Store state in S3 (uncomment after creating bucket)
  # backend "s3" {
  #   bucket = "voipsight-terraform-state"
  #   key    = "prod/terraform.tfstate"
  #   region = "ap-south-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ── Data sources ──
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_caller_identity" "current" {}

# ════════════════════════════════════════
# ECR REPOSITORIES
# ════════════════════════════════════════

resource "aws_ecr_repository" "frontend" {
  name                 = "voipsight-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.common_tags
}

resource "aws_ecr_repository" "backend" {
  name                 = "voipsight-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.common_tags
}

# ECR lifecycle policy — keep last 5 images only
resource "aws_ecr_lifecycle_policy" "frontend_policy" {
  repository = aws_ecr_repository.frontend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "backend_policy" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# ════════════════════════════════════════
# VPC AND NETWORKING
# ════════════════════════════════════════

# Use default VPC for simplicity
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ════════════════════════════════════════
# SECURITY GROUP
# ════════════════════════════════════════

resource "aws_security_group" "voipsight" {
  name        = "voipsight-sg"
  description = "Security group for VoIPSight EC2"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # Backend API
  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Node.js backend"
  }

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
    description = "SSH access"
  }

  # SIP WebSocket — Asterisk
  ingress {
    from_port   = 8088
    to_port     = 8089
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Asterisk WebSocket SIP"
  }

  # RTP media ports
  ingress {
    from_port   = 10000
    to_port     = 20000
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "RTP media"
  }

  # All outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, { Name = "voipsight-sg" })
}

# ════════════════════════════════════════
# KEY PAIR
# ════════════════════════════════════════

resource "aws_key_pair" "voipsight" {
  key_name   = "voipsight-key"
  public_key = var.ssh_public_key

  tags = var.common_tags
}

# ════════════════════════════════════════
# IAM ROLE FOR EC2 (ECR access)
# ════════════════════════════════════════

resource "aws_iam_role" "ec2_role" {
  name = "voipsight-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "ecr_access" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "voipsight-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ════════════════════════════════════════
# EC2 INSTANCE
# ════════════════════════════════════════

resource "aws_instance" "voipsight" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.voipsight.key_name
  vpc_security_group_ids = [aws_security_group.voipsight.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = true
  }

  # User data — install Docker and AWS CLI on first boot
  user_data = <<-EOF
    #!/bin/bash
    yum update -y

    # Install Docker
    yum install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user

    # Install AWS CLI v2
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install

    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    echo "VoIPSight EC2 ready" > /tmp/setup-complete.txt
  EOF

  tags = merge(var.common_tags, { Name = "voipsight-server" })
}

# Elastic IP — fixed public IP
resource "aws_eip" "voipsight" {
  instance = aws_instance.voipsight.id
  domain   = "vpc"
  tags     = merge(var.common_tags, { Name = "voipsight-eip" })
}