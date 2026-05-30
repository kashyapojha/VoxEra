output "ec2_public_ip" {
  description = "Public IP of EC2 instance"
  value       = aws_eip.voipsight.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of EC2 instance"
  value       = aws_instance.voipsight.public_dns
}

output "frontend_ecr_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "backend_ecr_url" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "app_url" {
  description = "VoIPSight application URL"
  value       = "http://${aws_eip.voipsight.public_ip}"
}

output "ssh_command" {
  description = "SSH command to connect to EC2"
  value       = "ssh -i voipsight-key.pem ec2-user@${aws_eip.voipsight.public_ip}"
}