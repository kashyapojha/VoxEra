#!/bin/bash
# Deploy VoxEra on EC2 — pull images from Docker Hub
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/voxera}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
DOCKER_USERNAME="${DOCKER_USERNAME:?DOCKER_USERNAME is required}"
DOCKERHUB_TOKEN="${DOCKERHUB_TOKEN:?DOCKERHUB_TOKEN is required}"
DOCKER_FRONTEND_REPO="${DOCKER_FRONTEND_REPO:-voxera-frontend}"
DOCKER_BACKEND_REPO="${DOCKER_BACKEND_REPO:-voxera-backend}"
JWT_SECRET="${JWT_SECRET:?JWT_SECRET is required}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
PUBLIC_HOST="${PUBLIC_HOST:?PUBLIC_HOST is required}"
ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-$PUBLIC_HOST}"

POSTGRES_DB="${POSTGRES_DB:-voxera}"
POSTGRES_USER="${POSTGRES_USER:-voxera}"
DATABASE_URL="${DATABASE_URL:-postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}}"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

cat > "$APP_DIR/.env" <<EOF
PUBLIC_HOST=${PUBLIC_HOST}
ASTERISK_EXTERNAL_IP=${ASTERISK_EXTERNAL_IP}
PORT=5000
JWT_SECRET=${JWT_SECRET}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=${DATABASE_URL}
ASTERISK_HOST=asterisk
ASTERISK_PORT=8088
DOCKER_USERNAME=${DOCKER_USERNAME}
DOCKER_FRONTEND_REPO=${DOCKER_FRONTEND_REPO}
DOCKER_BACKEND_REPO=${DOCKER_BACKEND_REPO}
IMAGE_TAG=${IMAGE_TAG}
EOF
chmod 600 "$APP_DIR/.env"

echo "$DOCKERHUB_TOKEN" | docker login --username "$DOCKER_USERNAME" --password-stdin

export DOCKER_USERNAME DOCKER_FRONTEND_REPO DOCKER_BACKEND_REPO IMAGE_TAG

if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose not found. Run scripts/bootstrap-ec2.sh first."
  exit 1
fi

$COMPOSE --env-file "$APP_DIR/.env" -f docker-compose.prod.yml pull
$COMPOSE --env-file "$APP_DIR/.env" -f docker-compose.prod.yml up -d --build --remove-orphans

sleep 8
curl -fsS http://localhost/api/health
echo ""
$COMPOSE --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps
