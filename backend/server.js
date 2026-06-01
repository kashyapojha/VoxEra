/**
 * server.js — VoxEra Backend
 * - User signup / login (JWT) — no auto extension assignment
 * - Feedback, calls monitoring, Socket.io realtime
 */

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const bcrypt     = require('bcryptjs')
const jwt        = require('jsonwebtoken')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'voxera-secret-2026'

// ── In-memory stores (replace with PostgreSQL in production) ──
const usersById    = new Map() // id → user object
const usersByEmail = new Map() // email → user id
const feedbacks    = []
const calls        = []
const activeCalls  = new Map() // callId → call details

function enrichActiveCall(callObj) {
  const duration = callObj.connectedAt
    ? Math.floor((Date.now() - callObj.connectedAt) / 1000)
    : 0
  return { ...callObj, duration }
}

function broadcastActiveCalls() {
  io.emit('active_calls_update', Array.from(activeCalls.values()).map(enrichActiveCall))
}

function getCallId(payload) {
  return payload?.id || payload?.callId || null
}

// ════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, department } = req.body

    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    if (usersByEmail.has(email)) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = Date.now().toString()

    const user = {
      id,
      name,
      email,
      password: hashedPassword,
      department,
      createdAt: new Date().toISOString(),
      status: 'available',
    }

    usersById.set(id, user)
    usersByEmail.set(email, id)

    console.info(`[AUTH] New user: ${name} | Dept: ${department}`)

    const token = jwt.sign({ userId: id, email, name, department }, JWT_SECRET, { expiresIn: '24h' })

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
      },
    })
  } catch (err) {
    console.error('[AUTH] Signup error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const userId = usersByEmail.get(email)
    if (!userId) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = usersById.get(userId)
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, department: user.department },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    console.info(`[AUTH] Login: ${user.name}`)

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
      },
    })
  } catch (err) {
    console.error('[AUTH] Login error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = usersById.get(decoded.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
    })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

// GET /api/users/directory — registered app users (no SIP extensions)
app.get('/api/users/directory', (req, res) => {
  const directory = []
  usersById.forEach((user) => {
    directory.push({
      name: user.name,
      department: user.department,
      email: user.email,
      status: user.status,
    })
  })
  return res.json(directory)
})

// Legacy alias
app.get('/api/users/extensions', (req, res) => {
  return res.redirect(307, '/api/users/directory')
})

// ════════════════════════════════════════
// FEEDBACK ROUTES
// ════════════════════════════════════════

app.post('/api/feedback', (req, res) => {
  const { name, department, rating, message } = req.body

  if (!name || !message || !rating) {
    return res.status(400).json({ error: 'Name, rating and message are required' })
  }

  const feedback = {
    id: Date.now().toString(),
    name: name.trim(),
    department: department || 'IT Department',
    rating: parseInt(rating),
    message: message.trim().slice(0, 200),
    createdAt: new Date().toISOString(),
    initials: name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
  }

  feedbacks.unshift(feedback)
  if (feedbacks.length > 100) feedbacks.pop()

  io.emit('new_feedback', feedback)
  return res.status(201).json({ message: 'Feedback submitted', feedback })
})

app.get('/api/feedback', (req, res) => {
  return res.json(feedbacks)
})

// ════════════════════════════════════════
// CALLS & MONITORING ROUTES
// ════════════════════════════════════════

app.get('/api/calls', (req, res) => {
  return res.json(calls)
})

app.get('/api/active-calls', (req, res) => {
  return res.json(Array.from(activeCalls.values()).map(enrichActiveCall))
})

app.post('/api/calls', (req, res) => {
  const { caller, callee, direction, status, duration } = req.body
  if (!caller) return res.status(400).json({ error: 'Caller is required' })

  const callObj = {
    id: Date.now().toString(),
    caller,
    callee: callee || 'Unknown',
    direction: direction || 'outbound',
    status: status || 'completed',
    duration: parseInt(duration || 0),
    timestamp: new Date().toISOString(),
  }

  calls.unshift(callObj)
  if (calls.length > 200) calls.pop()

  io.emit('call_history_update', calls.slice(0, 50))

  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === 'completed').length
  io.emit('stats_update', { totalCalls, completedCalls })

  return res.status(201).json(callObj)
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VoxEra',
    users: usersById.size,
    time: new Date(),
  })
})

app.get('/api/stats', (req, res) => {
  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === 'completed').length
  res.json({
    totalUsers: usersById.size,
    totalFeedback: feedbacks.length,
    avgRating:
      feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
        : '0.0',
    totalCalls,
    completedCalls,
  })
})

// ════════════════════════════════════════
// SOCKET.IO
// ════════════════════════════════════════

io.on('connection', (socket) => {
  console.info(`[SOCKET] Connected: ${socket.id}`)

  socket.emit('feedback_init', feedbacks.slice(0, 20))
  socket.emit('active_calls_update', Array.from(activeCalls.values()).map(enrichActiveCall))
  socket.emit('call_history_update', calls.slice(0, 50))

  socket.on('call_start', (payload) => {
    const id = getCallId(payload)
    if (!id) return

    let callObj = activeCalls.get(id)
    if (!callObj) {
      callObj = {
        id,
        caller: payload.caller || 'Unknown',
        callee: payload.callee || 'Unknown',
        direction: payload.direction || 'outbound',
        status: payload.status || 'calling',
        connectedAt: null,
        timestamp: new Date().toISOString(),
      }
      activeCalls.set(id, callObj)
    } else {
      if (payload.caller && payload.caller !== 'Me') callObj.caller = payload.caller
      if (payload.callee && payload.callee !== 'Me') callObj.callee = payload.callee
      callObj.status = payload.status || callObj.status
    }

    console.info(`[SOCKET] Call Start: ${callObj.caller} -> ${callObj.callee} [${callObj.status}]`)
    broadcastActiveCalls()
  })

  // First establish sets shared connectedAt — both parties sync duration from this
  socket.on('call_establish', (payload) => {
    const id = getCallId(payload)
    if (!id) return

    let callObj = activeCalls.get(id)
    if (!callObj) {
      callObj = {
        id,
        caller: payload.caller || 'Unknown',
        callee: payload.callee || 'Unknown',
        direction: payload.direction || 'outbound',
        status: 'connected',
        connectedAt: null,
        timestamp: new Date().toISOString(),
      }
      activeCalls.set(id, callObj)
    }

    callObj.status = 'connected'
    if (payload.caller && payload.caller !== 'Me') callObj.caller = payload.caller
    if (payload.callee && payload.callee !== 'Me') callObj.callee = payload.callee

    if (!callObj.connectedAt) {
      callObj.connectedAt = Date.now()
      io.emit('call_connected', { id, connectedAt: callObj.connectedAt })
      console.info(`[SOCKET] Call Connected (sync): ${callObj.caller} -> ${callObj.callee}`)
    }

    broadcastActiveCalls()
  })

  socket.on('call_end', (payload) => {
    const id = getCallId(payload)
    if (!id) return

    const callObj = activeCalls.get(id)
    if (!callObj) return

    activeCalls.delete(id)

    let finalDuration = parseInt(payload.duration || 0, 10)
    if (callObj.connectedAt) {
      finalDuration = Math.floor((Date.now() - callObj.connectedAt) / 1000)
    }

    const historyCall = {
      id: callObj.id,
      caller: callObj.caller,
      callee: callObj.callee,
      direction: callObj.direction,
      status: payload.status || 'completed',
      duration: finalDuration,
      timestamp: callObj.timestamp,
    }

    calls.unshift(historyCall)
    if (calls.length > 200) calls.pop()

    console.info(
      `[SOCKET] Call End: ${historyCall.caller} -> ${historyCall.callee} [${historyCall.status}, ${finalDuration}s]`
    )

    broadcastActiveCalls()
    io.emit('call_history_update', calls.slice(0, 50))

    const totalCalls = calls.length
    const completedCalls = calls.filter((c) => c.status === 'completed').length
    io.emit('stats_update', { totalCalls, completedCalls })
  })

  socket.on('disconnect', () => {
    console.info(`[SOCKET] Disconnected: ${socket.id}`)
  })
})

// Tick active call durations while calls are connected
setInterval(() => {
  if (activeCalls.size === 0) return
  broadcastActiveCalls()
}, 1000)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         VoxEra Backend — Running            ║
║         Port: ${PORT}                            ║
╚══════════════════════════════════════════════╝
  `)
})
