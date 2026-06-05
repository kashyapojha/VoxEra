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
const {
  initDb,
  checkDb,
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  createFeedback,
  listFeedbacks,
  getFeedbackStats,
} = require('./db')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[AUTH] JWT_SECRET is required')
  process.exit(1)
}
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost'
const ASTERISK_HOST = process.env.ASTERISK_HOST || 'localhost'
// Default to standard Asterisk HTTP/WS/ARI port 8088
const ASTERISK_PORT = process.env.ASTERISK_PORT || '8088'

// ── In-memory stores (calls — users & feedback persisted in PostgreSQL) ──
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

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await createUser({ name, email, passwordHash, department })

    console.info(`[AUTH] New user: ${user.name} | Dept: ${user.department}`)

    return res.status(201).json({
      message: 'Account created successfully. Please sign in.',
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

    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
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

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await findUserById(decoded.userId)
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
app.get('/api/users/directory', async (req, res) => {
  try {
    const directory = await listUsers()
    return res.json(directory)
  } catch (err) {
    console.error('[AUTH] Directory error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// Legacy alias
app.get('/api/users/extensions', (req, res) => {
  return res.redirect(307, '/api/users/directory')
})

// ════════════════════════════════════════
// FEEDBACK ROUTES
// ════════════════════════════════════════

app.post('/api/feedback', async (req, res) => {
  try {
    const { name, rating, message } = req.body

    if (!name || !message || rating == null) {
      return res.status(400).json({ error: 'Name, rating and message are required' })
    }

    const parsedRating = parseInt(rating, 10)
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const feedback = await createFeedback({
      name,
      rating: parsedRating,
      message,
    })

    io.emit('new_feedback', feedback)
    return res.status(201).json({ message: 'Feedback submitted', feedback })
  } catch (err) {
    console.error('[FEEDBACK] Submit error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await listFeedbacks(100)
    return res.json(feedbacks)
  } catch (err) {
    console.error('[FEEDBACK] List error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
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

app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok'
  try {
    await checkDb()
  } catch {
    dbStatus = 'error'
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    service: 'VoxEra',
    publicHost: PUBLIC_HOST,
    asterisk: { host: ASTERISK_HOST, port: ASTERISK_PORT },
    database: dbStatus,
    time: new Date(),
  })
})

app.get('/api/stats', async (req, res) => {
  const totalCalls = calls.length
  const completedCalls = calls.filter((c) => c.status === 'completed').length
  let totalUsers = 0
  try {
    const users = await listUsers()
    totalUsers = users.length
  } catch {
    totalUsers = 0
  }
  let totalFeedback = 0
  let avgRating = '0.0'
  try {
    const feedbackStats = await getFeedbackStats()
    totalFeedback = feedbackStats.total
    avgRating = feedbackStats.avgRating
  } catch {
    totalFeedback = 0
    avgRating = '0.0'
  }

  res.json({
    totalUsers,
    totalFeedback,
    avgRating,
    totalCalls,
    completedCalls,
  })
})

// ════════════════════════════════════════
// SOCKET.IO
// ════════════════════════════════════════

io.on('connection', async (socket) => {
  console.info(`[SOCKET] Connected: ${socket.id}`)

  try {
    const initialFeedbacks = await listFeedbacks(20)
    socket.emit('feedback_init', initialFeedbacks)
  } catch (err) {
    console.error('[SOCKET] feedback_init error:', err)
    socket.emit('feedback_init', [])
  }
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

async function start() {
  try {
    await initDb()
  } catch (err) {
    console.error('[DB] Failed to initialize:', err.message)
    process.exit(1)
  }

  server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║         VoxEra Backend — Running            ║
║         Port: ${PORT}  Host: ${PUBLIC_HOST}       ║
╚══════════════════════════════════════════════╝
    `)
  })
}

start()
