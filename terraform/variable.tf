variable "aws_region" {
  description = "AWS region to deploy in"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro" # Free tier eligible
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access — paste your public key here"
  type        = string
  # Generate with: ssh-keygen -t rsa -b 4096 -f voipsight-key
  # Then paste contents of voipsight-key.pub here
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH into EC2 — restrict to your IP"
  type        = string
  default     = "0.0.0.0/0" # Change to your IP: e.g. 103.x.x.x/32
}

variable "common_tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    Project     = "VoIPSight"
    Environment = "production"
    ManagedBy   = "Terraform"
    Owner       = "Kashyap Ojha"
  }
}