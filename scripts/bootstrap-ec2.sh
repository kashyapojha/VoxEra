#!/bin/bash
# One-time EC2 setup — supports Ubuntu/Debian and Amazon Linux/RHEL.
# Run after first SSH login: sudo bash scripts/bootstrap-ec2.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/bootstrap-ec2.sh"
  exit 1
fi

DEPLOY_USER="${SUDO_USER:-ubuntu}"
if ! id "$DEPLOY_USER" &>/dev/null; then
  DEPLOY_USER="ubuntu"
  id "$DEPLOY_USER" &>/dev/null || DEPLOY_USER="ec2-user"
fi

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
else
  echo "Cannot detect OS (/etc/os-release missing)"
  exit 1
fi

echo "Bootstrapping for ${PRETTY_NAME:-$ID} (deploy user: $DEPLOY_USER)..."

case "${ID:-}" in
  ubuntu|debian)
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl git python3
    if ! command -v docker &>/dev/null; then
      curl -fsSL https://get.docker.com | sh
    fi
    ;;
  amzn|rhel|centos|fedora)
    if command -v dnf &>/dev/null; then
      dnf update -y
      dnf install -y docker curl git python3
    else
      yum update -y
      yum install -y docker curl git python3
    fi
    systemctl start docker
    systemctl enable docker
    ;;
  *)
    echo "Unsupported OS: ${ID}. Use Ubuntu or Amazon Linux."
    exit 1
    ;;
esac

if ! docker compose version &>/dev/null 2>&1; then
  COMPOSE_VERSION="v2.24.0"
  ARCH="$(uname -m)"
  curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true

APP_DIR="/home/${DEPLOY_USER}/voxera"
mkdir -p "$APP_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "Bootstrap complete. Log out and back in as $DEPLOY_USER so the docker group applies."
echo "Deploy directory: $APP_DIR"
