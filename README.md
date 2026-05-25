# VoIPSight - SIP Softphone & Call Monitoring Dashboard

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
VoIPSight/
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

© 2026 VoIPSight. All rights reserved.

## Support

For issues and questions, please refer to the documentation or contact the development team.
