/**
 * db.js — PostgreSQL connection and schema bootstrap
 */

const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('[DB] DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          VARCHAR(255) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      department    VARCHAR(255) NOT NULL,
      status        VARCHAR(50)  NOT NULL DEFAULT 'available',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

    CREATE TABLE IF NOT EXISTS feedbacks (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(255) NOT NULL,
      rating     SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      message    VARCHAR(500) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at DESC);
  `)
  console.info('[DB] Schema ready')
}

function formatFeedback(row) {
  return {
    id: row.id,
    name: row.name,
    rating: row.rating,
    message: row.message,
    createdAt: row.created_at,
    initials: row.name
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
  }
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  )
  return rows[0] || null
}

async function findUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, email, department, status, created_at FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

async function createUser({ name, email, passwordHash, department }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, department)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, department, status, created_at`,
    [name.trim(), email.trim().toLowerCase(), passwordHash, department.trim()]
  )
  return rows[0]
}

async function listUsers() {
  const { rows } = await pool.query(
    'SELECT name, email, department, status FROM users ORDER BY created_at DESC'
  )
  return rows
}

async function createFeedback({ name, rating, message }) {
  const { rows } = await pool.query(
    `INSERT INTO feedbacks (name, rating, message)
     VALUES ($1, $2, $3)
     RETURNING id, name, rating, message, created_at`,
    [name.trim(), rating, message.trim().slice(0, 500)]
  )
  return formatFeedback(rows[0])
}

async function listFeedbacks(limit = 100) {
  const { rows } = await pool.query(
    `SELECT id, name, rating, message, created_at
     FROM feedbacks
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  )
  return rows.map(formatFeedback)
}

async function getFeedbackStats() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total, COALESCE(AVG(rating), 0) AS avg_rating FROM feedbacks`
  )
  return {
    total: rows[0].total,
    avgRating: parseFloat(rows[0].avg_rating).toFixed(1),
  }
}

async function checkDb() {
  await pool.query('SELECT 1')
}

module.exports = {
  pool,
  initDb,
  checkDb,
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  createFeedback,
  listFeedbacks,
  getFeedbackStats,
}
