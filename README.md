# BirlaTeams - SIP Softphone & Call Monitoring Dashboard

A modern, futuristic SIP softphone application with real-time call monitoring dashboard, built with React + Vite, featuring a dark enterprise SaaS-style UI inspired by cybersecurity and VoIP monitoring dashboards.

## Features

### Core Functionality
- **SIP Registration UI** - Configure and connect to SIP servers
- **Dialpad** - Full-featured dialpad with DTMF support
- **Make/Receive Calls** - Complete call handling with JsSIP
- **Call Controls** - Hold, mute, hangup functionality
- **Active Call Timer** - Real-time call duration tracking
- **SIP Logs** - Detailed SIP protocol logging
- **RTP Metrics** - Real-time RTP statistics
- **Call History** - Comprehensive call records
- **Active Calls** - Monitor ongoing calls
- **Real-time Analytics** - Live WebRTC graphs and metrics
- **Network Status** - Monitor latency, bandwidth, packet loss

### Pages
- **Landing** - Modern landing page with feature showcase
- **Dashboard** - Overview with stats and real-time monitoring
- **Softphone** - Full SIP softphone interface
- **Analytics** - Detailed call analytics and reporting
- **Login** - Secure authentication page
- **Settings** - Configuration and preferences

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Fast frontend build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - UI animations and transitions
- **Recharts** - Charting and analytics visualization
- **Lucide React** - Icon components
- **JsSIP** - Browser SIP client for WebRTC calls
- **Socket.io Client** - Real-time websocket updates
- **React Router** - SPA navigation

### Backend
- **Node.js** - JavaScript runtime for API and sockets
- **Express** - REST API and server middleware
- **Socket.io** - Real-time event bus and notifications
- **dotenv** - Environment configuration support

### WebRTC / Audio Handling
- Proper remote `audio` element attachment via `srcObject`
- `RTCPeerConnection` `track` and legacy `addstream` handling
- Autoplay resume support for browser restrictions
- Call cleanup for stable browser tab-to-tab calling

## Design System

### Colors
- **Background**: `#081120`
- **Primary Gradient**: `linear-gradient(135deg, #5B2EFF 0%, #4A3DFF 40%, #00A6FF 100%)`

### UI Elements
- Glassmorphism cards with backdrop blur
- Neon purple-blue gradients
- Glow effects on hover
- Blurred background blobs
- Rounded corners (2xl)
- Responsive layouts

## Installation

```bash
# Install dependencies
npm install

# Copy the example env file before starting
cp .env.example .env
# Then edit .env with your SIP and backend values.

# Start backend and frontend in separate terminals
# Backend (server and socket API)
cd backend
npm install
node server.js

# Frontend
cd ..
npm run dev
```

> Note: `.env` is ignored by git and should contain only local secrets or SIP credentials. Do not commit `.env`.

## Project Structure

```
BirlaTeams/
├── src/
│   ├── components/
│   │   ├── Analytics/
│   │   │   ├── RealtimeChart.jsx
│   │   │   └── CallHistory.jsx
│   │   ├── Layout/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── Monitoring/
│   │   │   ├── ActiveCalls.jsx
│   │   │   ├── NetworkStatus.jsx
│   │   │   ├── RTPMetrics.jsx
│   │   │   └── SIPLogs.jsx
│   │   ├── Softphone/
│   │   │   ├── CallControls.jsx
│   │   │   ├── CallTimer.jsx
│   │   │   ├── DialPad.jsx
│   │   │   └── IncomingCallModal.jsx
│   │   └── UI/
│   │       └── GlassCard.jsx
│   ├── context/
│   │   ├── SIPContext.jsx
│   │   └── SocketContext.jsx
│   ├── pages/
│   │   ├── Analytics.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Settings.jsx
│   │   └── Softphone.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Components

### Reusable UI Components
- **GlassCard** - Glassmorphism card component with optional hover and glow effects
- **Navbar** - Responsive navigation with dropdown menu
- **Sidebar** - Collapsible sidebar with quick stats

### Softphone Components
- **DialPad** - Full dialpad with number input
- **CallControls** - Mute, hold, speaker, and hangup controls
- **CallTimer** - Real-time call duration display
- **IncomingCallModal** - Modal for handling incoming calls

### Monitoring Components
- **SIPLogs** - Real-time SIP protocol logs with filtering
- **RTPMetrics** - RTP statistics (packets, bytes, jitter, RTT, packet loss)
- **ActiveCalls** - List of currently active calls
- **NetworkStatus** - Network health indicators

### Analytics Components
- **RealtimeChart** - Live updating charts for calls and bandwidth
- **CallHistory** - Comprehensive call history with details

## Context Providers

### SIPContext
Provides SIP functionality using JsSIP:
- Register/unregister with SIP server
- Make/receive calls
- Call controls (hold, mute, hangup)
- SIP logging
- RTP metrics tracking

### SocketContext
Provides Socket.io integration:
- Connection management
- Real-time event handling
- Message emission/reception

## SIP Configuration

Configure SIP settings in the Settings page:

1. Navigate to Settings → SIP Configuration
2. Enter your WebSocket URL (e.g., `wss://sip.example.com:8089/ws`)
3. Enter your SIP URI (e.g., `sip:1001@example.com`)
4. Enter your password
5. Click "Register"

## Usage

### Making a Call
1. Navigate to the Softphone page
2. Ensure SIP is registered (check status indicator)
3. Enter the phone number using the dialpad
4. Click the call button
5. Use call controls during the call

### Receiving a Call
- Incoming calls trigger a modal
- Click the green button to answer
- Click the red button to reject

### Monitoring
- Dashboard shows real-time overview
- Analytics page provides detailed metrics
- SIP logs show protocol-level information
- Network status displays connection health

## Customization

### Tailwind Configuration
Edit `tailwind.config.js` to customize:
- Color palette
- Gradients
- Animations
- Spacing
- Typography

### Theme Colors
The theme uses a dark background with neon accents. Modify in:
- `tailwind.config.js` - Theme extension
- `src/index.css` - Custom utilities and animations

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires WebRTC support

## Security Notes

- SIP credentials should be stored securely
- Use WSS (WebSocket Secure) for production
- Implement proper authentication on the backend
- Enable call encryption in production

## Production Deployment

```bash
# Build the project
npm run build

# The build output will be in the dist/ directory
# Deploy the dist/ folder to your web server
```

## Future Enhancements

- [ ] Video calling support
- [ ] Call recording
- [ ] Conference calls
- [ ] Contact directory
- [ ] Call transfer
- [ ] Voicemail integration
- [ ] Advanced analytics reports
- [ ] Multi-language support
- [ ] PWA support
- [ ] Desktop notifications

## License

© 2026 BirlaTeams. All rights reserved.

## Support

For issues and questions, please refer to the documentation or contact the development team.

## Developer Notes

Quick commands to run the project locally (two terminals):

Frontend (Vite):
```bash
npm install
npm run dev
```

Backend (server + socket):
```bash
cd backend
npm install
node server.js
```

Environment variables (Vite uses VITE_ prefix):
- `VITE_BACKEND_URL` — backend socket/api base URL (default: http://localhost:5000)
- `VITE_SIP_WS` — SIP WebSocket URL (e.g. ws://172.29.175.83:8088/ws)
- `VITE_SIP_URI` — SIP URI (e.g. sip:1001@example.com)
- `VITE_SIP_PASSWORD` — SIP account password
- `VITE_SIP_DOMAIN` — optional SIP domain
- `VITE_SIP_EXT` — optional extension id

What I updated in the UI and context for reliable live data:
- `SIPContext` now exposes `sipConfig` and `setSipConfig`, polls PeerConnection.getStats during active calls to update RTP metrics, and pushes SIP logs (capped to last 100 entries).
- Settings page loads/saves `voipsight_settings` to `localStorage` and uses `sipConfig` for register/unregister actions.
- Softphone: dialpad and call button are disabled when not registered; call timer, mute/hold/hangup controls work during calls.
- Dashboard / Analytics / Active Calls / Call History / Realtime Chart / Network Status / SIP Logs: wired to backend endpoints and Socket.io events so the UI shows sensible defaults before registration and live updates after registration.

Socket.io events the frontend listens for (backend should emit these):
- `init` — initial server state
- `sip_event` — SIP log event
- `call_connected` — a call was answered
- `call_ended` — a call ended
- `call_history_update` — new/updated call history
- `active_calls_update` — active calls changed
- `quality_update` — RTP metrics update
- `extension_update` — extension status changed
- `stats_update` — backend stats changed (totalCalls, etc.)

Notes / Troubleshooting:
- The UI never shows `undefined`/`NaN`/`null`; values fallback to `0`, `N/A`, or formatted placeholders.
- If audio autoplay is blocked by the browser, click anywhere in the page to resume playback (SIPContext installs a one-time click resume handler).
- If you see missing data, verify the backend emits the listed socket events and that `VITE_BACKEND_URL` points to the correct host.

# BirlaTeams — DevOps Setup Guide

## Architecture

```
GitHub Push → CI/CD Pipeline
                ↓
         Build & Test (Node.js)
                ↓
         Docker Build
                ↓
         Push to AWS ECR
                ↓
         Deploy to AWS EC2
                ↓
         BirlaTeams Live at http://EC2_IP
```

---

## Folder Structure

```
BirlaTeams/
├── Dockerfile                        ← Frontend React image
├── docker-compose.yml                ← Local dev + prod compose
├── nginx/
│   └── nginx.conf                    ← Nginx SPA config
├── backend/
│   └── Dockerfile                    ← Backend Node.js image
├── terraform/
│   ├── main.tf                       ← AWS resources
│   ├── variables.tf                  ← Input variables
│   ├── outputs.tf                    ← Output values
│   └── terraform.tfvars              ← Your actual values (gitignored)
└── .github/
    └── workflows/
        └── ci-cd.yml                 ← Full pipeline
```

---

## Step 1 — AWS Setup

### 1.1 Create IAM User

1. AWS Console → IAM → Users → Create User
2. Name: `voipsight-deploy`
3. Attach policy: `AdministratorAccess`
4. Create user → Security credentials → Create access key
5. Use case: CLI
6. Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### 1.2 Configure AWS CLI locally

```bash
aws configure
# Enter: Access Key ID
# Enter: Secret Access Key
# Region: ap-south-1
# Output: json
```

---

## Step 2 — SSH Key Generation

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f voipsight-key

# This creates:
# voipsight-key     ← private key (keep secret)
# voipsight-key.pub ← public key (paste in terraform.tfvars)
```

---

## Step 3 — Terraform — Provision AWS Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Apply — creates EC2, ECR, Security Group, EIP
terraform apply

# Note the outputs:
# ec2_public_ip
# frontend_ecr_url
# backend_ecr_url
# app_url
# ssh_command
```

### What Terraform creates:

| Resource | Details |
|---|---|
| EC2 Instance | t2.micro, Amazon Linux 2023 |
| Elastic IP | Fixed public IP |
| Security Group | Ports 80, 443, 5000, 22, 8088-8089, RTP |
| ECR Frontend | Docker image registry |
| ECR Backend | Docker image registry |
| IAM Role | EC2 → ECR read access |

---

## Step 4 — GitHub Secrets Setup

Go to: GitHub → voipsight repo → Settings → Secrets → Actions

Add these secrets:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | From IAM user |
| `AWS_SECRET_ACCESS_KEY` | From IAM user |
| `EC2_HOST` | Elastic IP from Terraform output |
| `EC2_SSH_KEY` | Contents of `voipsight-key` (private key) |
| `VITE_SIP_DOMAIN` | Your Asterisk IP |
| `VITE_SIP_WS` | ws://your-asterisk-ip:8088/ws |
| `VITE_BACKEND_URL` | http://EC2_IP:5000 |

---

## Step 5 — Local Docker Test

Before pushing to GitHub, test Docker locally:

```bash
# Build and run everything
docker-compose up --build

# Frontend: http://localhost:80
# Backend:  http://localhost:5000/api/health

# Stop
docker-compose down
```

---

## Step 6 — Push to GitHub → Pipeline Runs

```bash
git add .
git commit -m "Add DevOps setup"
git push origin main
```

Pipeline will automatically:
1. Install dependencies and build frontend
2. Run tests
3. Build Docker images
4. Push to ECR
5. SSH into EC2 and deploy containers

---

## Step 7 — Verify Deployment

```bash
# SSH into EC2
ssh -i voipsight-key.pem ec2-user@YOUR_EC2_IP

# Check running containers
docker ps

# Check logs
docker logs voipsight-frontend
docker logs voipsight-backend

# Test health
curl http://localhost/api/health
```

---

## Pipeline Jobs Summary

### Job 1 — Build & Test
- Runs on every push and PR
- Installs dependencies
- Builds frontend
- Runs tests

### Job 2 — Docker Build & Push
- Runs only on main branch push
- Builds frontend and backend images
- Tags with git SHA and latest
- Pushes to AWS ECR

### Job 3 — Deploy to EC2
- Runs after successful Docker push
- SSHs into EC2
- Pulls latest images from ECR
- Restarts containers
- Verifies health endpoint

---

## Destroy Infrastructure (when done)

```bash
cd terraform
terraform destroy
```

This removes all AWS resources and stops billing.

---

## Cost Estimate

| Resource | Monthly Cost |
|---|---|
| EC2 t2.micro | Free tier (750 hrs/month) |
| Elastic IP | Free when attached to running instance |
| ECR | Free tier (500MB storage) |
| Data transfer | Minimal for demo usage |
| **Total** | **~$0 on free tier** |

---

## GitHub Actions Secrets Reference

```
AWS_ACCESS_KEY_ID       → IAM user access key
AWS_SECRET_ACCESS_KEY   → IAM user secret key
EC2_HOST                → Elastic IP address
EC2_SSH_KEY             → Private SSH key (full contents of voipsight-key)
VITE_SIP_DOMAIN         → Asterisk server IP
VITE_SIP_WS             → ws://asterisk-ip:8088/ws
VITE_BACKEND_URL        → http://ec2-ip:5000
```


/**
 * Integration Example
 * ===================
 * How to add CallQualityPanel to your existing Softphone.jsx
 *
 * Step 1: Import the hook and panel
 * Step 2: Pass currentCall from SIPContext to the hook
 * Step 3: Render CallQualityPanel with stats and history
 */

import { useSIP } from '../../context/SIPContext'
import { useWebRTCStats } from '../../hooks/useWebRTCStats'
import { CallQualityPanel } from '../../components/QoS/QoSComponents'

// ── Inside your Softphone component ──
const SoftphoneWithQoS = () => {
  const { currentCall, callStatus, isRegistered } = useSIP()

  // Pass active JsSIP session to hook — it handles start/stop automatically
  const { stats, history } = useWebRTCStats(currentCall)

  const isInCall = callStatus !== 'idle' && callStatus !== 'ended'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Your existing softphone UI here */}
      <div>
        {/* DialPad, CallControls etc */}
      </div>

      {/* Call Quality Panel — right side */}
      <CallQualityPanel
        stats={stats}
        history={history}
        isActive={isInCall}
      />

    </div>
  )
}

export default SoftphoneWithQoS

/**
 * ── Folder Structure ──
 *
 * src/
 * ├── hooks/
 * │   └── useWebRTCStats.js          ← custom hook
 * ├── utils/
 * │   └── statsParser.js             ← parsing + quality score logic
 * ├── components/
 * │   └── QoS/
 * │       └── QoSComponents.jsx      ← all dashboard components
 * └── pages/
 *     └── Softphone.jsx              ← integrate CallQualityPanel here
 *
 *
 * ── How each metric is calculated ──
 *
 * JITTER
 *   Source: inbound-rtp → report.jitter (in seconds)
 *   Formula: jitter * 1000 → milliseconds
 *   Meaning: Statistical variance in packet arrival timing.
 *            High jitter = choppy audio.
 *
 * RTT (Round Trip Time)
 *   Source 1: remote-inbound-rtp → report.roundTripTime (seconds)
 *   Source 2: candidate-pair → report.currentRoundTripTime (seconds)
 *   Formula: rtt * 1000 → milliseconds
 *   Meaning: Time for a packet to travel to remote and back.
 *            High RTT = conversation feels delayed.
 *
 * PACKET LOSS
 *   Source: inbound-rtp → packetsReceived + packetsLost
 *   Formula: (packetsLost / (packetsReceived + packetsLost)) * 100
 *   Meaning: Percentage of RTP packets that never arrived.
 *            >5% causes audible dropouts and artifacts.
 *
 * BITRATE
 *   Source: inbound-rtp → bytesReceived (cumulative)
 *   Formula: (bytesReceived_now - bytesReceived_prev) * 8 / intervalSeconds / 1000 → kbps
 *   Meaning: Current audio data throughput. Opus uses ~24-32 kbps for voice.
 *
 * CODEC
 *   Source: inbound-rtp → codecId → codec report → mimeType
 *   Example: 'audio/opus' → displayed as 'OPUS'
 *
 * ICE CANDIDATE TYPE
 *   Source: candidate-pair (state=succeeded) → localCandidateId → local-candidate → candidateType
 *   Values:
 *     host  = direct LAN connection (best)
 *     srflx = NAT traversal via STUN (good)
 *     relay = via TURN server (acceptable, higher latency)
 *
 * CALL QUALITY SCORE
 *   Starts at 100, deducted based on thresholds:
 *   Jitter:      >50ms=-40, >30ms=-25, >15ms=-10
 *   RTT:         >300ms=-40, >150ms=-25, >80ms=-10
 *   PacketLoss:  >10%=-40, >5%=-25, >1%=-10
 *   Score >= 80 → Excellent
 *   Score >= 60 → Good
 *   Score >= 40 → Fair
 *   Score  < 40 → Poor
 */

