const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");
const path       = require("path");

// ── APP SETUP ──
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// ── IN-MEMORY STORE ──
let callHistory  = [];
let activeCalls  = {};
let sipLog       = [];
let extensions   = [
  { ext: "101", name: "IT Support",    department: "IT",   status: "available" },
  { ext: "102", name: "HR Executive",  department: "HR",   status: "available" },
  { ext: "103", name: "Plant Manager", department: "Ops",  status: "available" },
  { ext: "104", name: "Security Desk", department: "Security", status: "available" },
  { ext: "105", name: "Admin Office",  department: "Admin",status: "available" },
];

// ── HELPER — Add SIP Log Entry ──
function addSipLog(method, from, to, detail) {
  const entry = {
    id:        Date.now(),
    method,
    from:      from || "unknown",
    to:        to   || "unknown",
    detail:    detail || "",
    timestamp: new Date().toLocaleTimeString()
  };
  sipLog.unshift(entry);
  if (sipLog.length > 100) sipLog.pop(); // keep last 100
  io.emit("sip_event", entry);
  return entry;
}

// ── HELPER — Format Duration ──
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
}

// ═══════════════════════════════════════
//              REST APIs
// ═══════════════════════════════════════

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "VoIPSight backend running", time: new Date() });
});

// Get all extensions
app.get("/api/extensions", (req, res) => {
  res.json(extensions);
});

// Get call history
app.get("/api/calls", (req, res) => {
  res.json(callHistory);
});

// Get active calls
app.get("/api/active-calls", (req, res) => {
  res.json(Object.values(activeCalls));
});

// Get SIP log
app.get("/api/sip-log", (req, res) => {
  res.json(sipLog);
});

// Get dashboard stats
app.get("/api/stats", (req, res) => {
  res.json({
    totalCalls:    callHistory.length,
    activeCalls:   Object.keys(activeCalls).length,
    totalExtensions: extensions.length,
    availableExtensions: extensions.filter(e => e.status === "available").length,
  });
});

// Post SIP event from browser
app.post("/api/sip-event", (req, res) => {
  const { method, from, to, detail } = req.body;
  const entry = addSipLog(method, from, to, detail);
  res.json({ success: true, entry });
});

// ═══════════════════════════════════════
//           SOCKET.IO EVENTS
// ═══════════════════════════════════════

io.on("connection", (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Send current state to newly connected client
  socket.emit("init", {
    sipLog,
    activeCalls: Object.values(activeCalls),
    extensions,
    stats: {
      totalCalls:          callHistory.length,
      activeCalls:         Object.keys(activeCalls).length,
      totalExtensions:     extensions.length,
      availableExtensions: extensions.filter(e => e.status === "available").length,
    }
  });

  // ── SIP REGISTER ──
  socket.on("sip_register", (data) => {
    const { ext, name } = data;
    console.log(`[SIP] REGISTER — ext ${ext}`);
    addSipLog("REGISTER", ext, "Asterisk", `${name || ext} registered successfully`);

    // Update extension status
    const exObj = extensions.find(e => e.ext === ext);
    if (exObj) exObj.status = "available";
    io.emit("extension_update", extensions);
  });

  // ── SIP INVITE (outgoing call) ──
  socket.on("sip_invite", (data) => {
    const { from, to, callId } = data;
    console.log(`[SIP] INVITE — ${from} → ${to}`);

    activeCalls[callId] = {
      callId,
      from,
      to,
      startTime: Date.now(),
      status: "ringing"
    };

    addSipLog("INVITE",   from, to, `Call initiated`);

    setTimeout(() => {
      addSipLog("TRYING",   "Asterisk", to, `Processing call`);
      io.emit("call_trying", { callId, from, to });
    }, 300);

    setTimeout(() => {
      addSipLog("RINGING",  "Asterisk", from, `Remote party ringing`);
      io.emit("call_ringing", { callId, from, to });
    }, 800);

    // Update extension status
    const fromExt = extensions.find(e => e.ext === from);
    if (fromExt) fromExt.status = "busy";
    io.emit("extension_update", extensions);
    io.emit("active_calls_update", Object.values(activeCalls));
  });

  // ── SIP ANSWER (200 OK) ──
  socket.on("sip_answer", (data) => {
    const { from, to, callId } = data;
    console.log(`[SIP] 200 OK — ${from} ↔ ${to}`);

    if (activeCalls[callId]) {
      activeCalls[callId].status    = "connected";
      activeCalls[callId].answeredAt = Date.now();
    }

    addSipLog("200 OK", to, from, `Call connected — audio stream started`);
    addSipLog("ACK",    from, to,  `Call acknowledged`);

    const toExt = extensions.find(e => e.ext === to);
    if (toExt) toExt.status = "busy";

    io.emit("call_connected",      { callId, from, to });
    io.emit("extension_update",    extensions);
    io.emit("active_calls_update", Object.values(activeCalls));
  });

  // ── SIP BYE (hangup) ──
  socket.on("sip_bye", (data) => {
    const { from, to, callId, duration, qualityMetrics } = data;
    console.log(`[SIP] BYE — ${from} ↔ ${to}`);

    const call = activeCalls[callId];
    const dur  = call?.answeredAt
      ? formatDuration(Date.now() - call.answeredAt)
      : "00:00";

    // Save to call history
    callHistory.unshift({
      id:         Date.now(),
      caller:     from,
      receiver:   to,
      startTime:  call?.startTime
        ? new Date(call.startTime).toLocaleTimeString()
        : new Date().toLocaleTimeString(),
      duration:   duration || dur,
      status:     "completed",
      quality:    qualityMetrics || null
    });

    if (callHistory.length > 200) callHistory.pop();

    addSipLog("BYE",    from, to, `Call ended — duration ${duration || dur}`);
    addSipLog("200 OK", to,   from, `Call terminated`);

    // Free up extensions
    delete activeCalls[callId];
    const fromExt = extensions.find(e => e.ext === from);
    const toExt   = extensions.find(e => e.ext === to);
    if (fromExt) fromExt.status = "available";
    if (toExt)   toExt.status   = "available";

    io.emit("call_ended",          { callId, from, to, duration: duration || dur });
    io.emit("call_history_update", callHistory.slice(0, 20));
    io.emit("extension_update",    extensions);
    io.emit("active_calls_update", Object.values(activeCalls));
    io.emit("stats_update", {
      totalCalls:          callHistory.length,
      activeCalls:         Object.keys(activeCalls).length,
      totalExtensions:     extensions.length,
      availableExtensions: extensions.filter(e => e.status === "available").length,
    });
  });

  // ── RTP QUALITY METRICS ──
  socket.on("rtp_metrics", (data) => {
    const { callId, jitter, packetLoss, latency, bitrate } = data;
    if (activeCalls[callId]) {
      activeCalls[callId].quality = { jitter, packetLoss, latency, bitrate };
    }
    io.emit("quality_update", { callId, jitter, packetLoss, latency, bitrate });
  });

  // ── HOLD ──
  socket.on("sip_hold", (data) => {
    const { from, to, callId } = data;
    if (activeCalls[callId]) activeCalls[callId].status = "on-hold";
    addSipLog("re-INVITE", from, to, `Call placed on hold`);
    io.emit("call_held",           { callId });
    io.emit("active_calls_update", Object.values(activeCalls));
  });

  // ── RESUME ──
  socket.on("sip_resume", (data) => {
    const { from, to, callId } = data;
    if (activeCalls[callId]) activeCalls[callId].status = "connected";
    addSipLog("re-INVITE", from, to, `Call resumed`);
    io.emit("call_resumed",        { callId });
    io.emit("active_calls_update", Object.values(activeCalls));
  });

  // ── MUTE ──
  socket.on("sip_mute", (data) => {
    addSipLog("INFO", data.from, data.to, `Microphone muted`);
  });

  // ── UNMUTE ──
  socket.on("sip_unmute", (data) => {
    addSipLog("INFO", data.from, data.to, `Microphone unmuted`);
  });

  // ── DISCONNECT ──
  socket.on("disconnect", () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

// ── START SERVER ──
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         VoIPSight Backend — Running          ║
║         Port: ${PORT}                        ║
╚══════════════════════════════════════════════╝

  API Endpoints:
  ─────────────────────────────────────
  GET  /api/health
  GET  /api/extensions
  GET  /api/calls
  GET  /api/active-calls
  GET  /api/sip-log
  GET  /api/stats
  POST /api/sip-event

  Socket.io Events (incoming):
  ─────────────────────────────────────
  sip_register  sip_invite   sip_answer
  sip_bye       sip_hold     sip_resume
  sip_mute      sip_unmute   rtp_metrics

  Socket.io Events (outgoing):
  ─────────────────────────────────────
  sip_event     call_trying    call_ringing
  call_connected call_ended   quality_update
  extension_update active_calls_update
  call_history_update stats_update
  `);
});