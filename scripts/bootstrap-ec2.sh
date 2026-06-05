#!/bin/bash
# One-time setup on existing EC2 (run after first SSH login as ec2-user)
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/bootstrap-ec2.sh"
  exit 1
fi

yum update -y
yum install -y docker unzip wget
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

if ! command -v aws &>/dev/null; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
fi

COMPOSE_VERSION="v2.24.0"
curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

mkdir -p /opt/voxera
chown ec2-user:ec2-user /opt/voxera

echo "Bootstrap complete. Log out and back in so docker group applies."
