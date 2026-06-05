# VoxEra — AWS Deployment Guide

Deploy to a manually configured EC2 instance using **Docker Hub** and GitHub Actions.
**No Terraform** — AWS is set up in the console.

---

## Architecture

```
GitHub push (main) → Build & Test → Docker push to Docker Hub → SSH deploy to EC2
                                                                      ↓
                                        frontend (nginx :80) + backend + postgres + asterisk
```

---

## 1. AWS setup (manual, one-time)

### EC2 instance
- Amazon Linux 2023 or similar
- Instance type: `c7i-flex.large` or larger (WebRTC needs CPU)
- Attach an **Elastic IP** (stable public IP)

### Security group — open these ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | Frontend (nginx) |
| 8088 | TCP | Asterisk WebSocket (SIP) |
| 5060 | UDP | SIP signaling |
| 10000–20000 | UDP | RTP media |

### Docker Hub
Create two repositories under your Docker Hub account:
- `voxera-frontend`
- `voxera-backend`

(Or use **Variables** below to use different repo names.)

### Bootstrap EC2 (one-time)

```bash
ssh -i VoxEra.pem ubuntu@<YOUR_ELASTIC_IP>   # Ubuntu AMI (use ec2-user for Amazon Linux)
sudo bash scripts/bootstrap-ec2.sh
sudo mkdir -p /opt/voxera
sudo chown ec2-user:ec2-user /opt/voxera
```

---

## 2. GitHub Secrets (required)

Repository → **Settings** → **Secrets and variables** → **Actions**

| Secret | Example / notes |
|--------|-----------------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token ([Account Settings → Security](https://hub.docker.com/settings/security)) |
| `EC2_HOST` | Your Elastic IP, e.g. `13.62.237.148` |
| `EC2_USER` | `ubuntu` for Ubuntu AMI, `ec2-user` for Amazon Linux |
| `EC2_SSH_KEY` | Full contents of `VoxEra.pem` (private key, not `.pub`) |
| `EC2_SSH_KEY_B64` | Optional: base64-encoded `VoxEra.pem` (more reliable on Windows) |
| `JWT_SECRET` | Long random string, e.g. `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | Long random string for Postgres |
| `PUBLIC_HOST` | Same as Elastic IP (no `http://`) |
| `ASTERISK_EXTERNAL_IP` | Same as Elastic IP (optional — defaults to `PUBLIC_HOST`) |
| `VITE_API_URL` | **Leave empty** — nginx proxies `/api` same-origin |
| `VITE_SIP_WS_URL` | `wss://<ELASTIC_IP>:8089/ws` |
| `VITE_SIP_URI` | `sip:1001@<ELASTIC_IP>` |
| `VITE_SIP_PASSWORD` | `1001` |

**Not needed anymore:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (ECR removed).

### GitHub Variables (optional)

| Variable | Default |
|----------|---------|
| `DOCKER_FRONTEND_REPO` | `voxera-frontend` |
| `DOCKER_BACKEND_REPO` | `voxera-backend` |

Images are pushed as:
- `<DOCKER_USERNAME>/voxera-frontend:latest`
- `<DOCKER_USERNAME>/voxera-backend:latest`

---

## 3. Local development

```bash
cp .env.example .env.local
docker compose --env-file .env.local up --build
```

---

## 4. Deploy to production

```bash
git push origin main
```

Pipeline:
1. Builds and tests frontend + backend
2. Pushes images to **Docker Hub** (tagged with git SHA + `latest`)
3. SCPs compose + deploy script + `asterisk/` to EC2
4. Logs into Docker Hub on EC2, pulls images, starts containers

---

## 5. Verify

```bash
curl http://<ELASTIC_IP>/api/health
ssh -i VoxEra.pem ec2-user@<ELASTIC_IP> "docker ps"
```

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| Docker Hub push denied | Check `DOCKER_USERNAME` + `DOCKERHUB_TOKEN` secrets |
| EC2 pull denied | Ensure repos exist; token has read access; login runs in deploy script |
| Backend won't start | `docker logs voxera-backend` — check `JWT_SECRET`, `DATABASE_URL` |
| SIP won't register | Open 8088/8089 + UDP 10000–20000; verify `VITE_SIP_*` secrets |
| SSH auth fails in Actions | Set `EC2_USER=ubuntu` if using Ubuntu AMI; ensure `EC2_SSH_KEY` is the full `VoxEra.pem` private key |
| SSH auth still fails | Create `EC2_SSH_KEY_B64`: on Windows `certutil -encode VoxEra.pem temp.b64` then copy the encoded block (no headers) into the secret |

---

## Files never committed

- `.env.local`, `.env.production`, `*.pem`

Use `.env.example` as the reference template.
