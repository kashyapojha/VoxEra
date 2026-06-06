#!/bin/bash
# Deploy VoxEra on EC2 — pull images from Docker Hub
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/voxera}"
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
ENCODED_PASSWORD="$(POSTGRES_PASSWORD="$POSTGRES_PASSWORD" python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["POSTGRES_PASSWORD"], safe=""))')"
DATABASE_URL="${DATABASE_URL:-postgres://${POSTGRES_USER}:${ENCODED_PASSWORD}@postgres:5432/${POSTGRES_DB}}"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "Using GitHub secrets: JWT_SECRET=${JWT_SECRET:+set} POSTGRES_PASSWORD=${POSTGRES_PASSWORD:+set}"

# Write .env safely (handles special characters in secrets)
APP_DIR="$APP_DIR" \
PUBLIC_HOST="$PUBLIC_HOST" \
ASTERISK_EXTERNAL_IP="$ASTERISK_EXTERNAL_IP" \
JWT_SECRET="$JWT_SECRET" \
POSTGRES_DB="$POSTGRES_DB" \
POSTGRES_USER="$POSTGRES_USER" \
POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
DATABASE_URL="$DATABASE_URL" \
DOCKER_USERNAME="$DOCKER_USERNAME" \
DOCKER_FRONTEND_REPO="$DOCKER_FRONTEND_REPO" \
DOCKER_BACKEND_REPO="$DOCKER_BACKEND_REPO" \
IMAGE_TAG="$IMAGE_TAG" \
python3 - <<'PY'
import os
from pathlib import Path

def quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'

env = {
    "PUBLIC_HOST": os.environ["PUBLIC_HOST"],
    "ASTERISK_EXTERNAL_IP": os.environ["ASTERISK_EXTERNAL_IP"],
    "PORT": "5000",
    "JWT_SECRET": os.environ["JWT_SECRET"],
    "POSTGRES_DB": os.environ["POSTGRES_DB"],
    "POSTGRES_USER": os.environ["POSTGRES_USER"],
    "POSTGRES_PASSWORD": os.environ["POSTGRES_PASSWORD"],
    "DATABASE_URL": os.environ["DATABASE_URL"],
    "ASTERISK_HOST": "asterisk",
    "ASTERISK_PORT": "8089",
    "DOCKER_USERNAME": os.environ["DOCKER_USERNAME"],
    "DOCKER_FRONTEND_REPO": os.environ["DOCKER_FRONTEND_REPO"],
    "DOCKER_BACKEND_REPO": os.environ["DOCKER_BACKEND_REPO"],
    "IMAGE_TAG": os.environ["IMAGE_TAG"],
}

path = Path(os.environ["APP_DIR"]) / ".env"
path.write_text("\n".join(f"{k}={quote(v)}" for k, v in env.items()) + "\n")
PY
chmod 600 "$APP_DIR/.env"

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1; then
  if sudo docker info &>/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    echo "Docker is not installed or not running. Run scripts/bootstrap-ec2.sh first."
    exit 1
  fi
fi

echo "$DOCKERHUB_TOKEN" | "${DOCKER[@]}" login --username "$DOCKER_USERNAME" --password-stdin

export DOCKER_USERNAME DOCKER_FRONTEND_REPO DOCKER_BACKEND_REPO IMAGE_TAG

if "${DOCKER[@]}" compose version &>/dev/null 2>&1; then
  COMPOSE=("${DOCKER[@]}" compose)
elif command -v docker-compose &>/dev/null; then
  if [ "${DOCKER[0]}" = "sudo" ]; then
    COMPOSE=(sudo docker-compose)
  else
    COMPOSE=(docker-compose)
  fi
else
  echo "Docker Compose not found. Run scripts/bootstrap-ec2.sh first."
  exit 1
fi

echo "[deploy] Pulling app images..."
time "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml pull backend frontend postgres

echo "[deploy] Starting containers (asterisk builds only if image missing)..."
if ! time "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml up -d --remove-orphans; then
  echo "=== docker compose up failed ==="
  "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps -a || true
  for c in voxera-backend voxera-frontend voxera-postgres voxera-asterisk; do
    echo "=== logs: $c ==="
    "${DOCKER[@]}" logs "$c" --tail 80 2>&1 || true
  done
  exit 1
fi

echo "Waiting for backend health..."
for i in $(seq 1 30); do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    echo "Backend healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "=== Health check timed out ==="
    "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps -a || true
    for c in voxera-backend voxera-frontend voxera-postgres voxera-asterisk; do
      echo "=== logs: $c ==="
      "${DOCKER[@]}" logs "$c" --tail 80 2>&1 || true
    done
    exit 1
  fi
  sleep 2
done

curl -fsS http://localhost/api/health
echo ""
"${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps
