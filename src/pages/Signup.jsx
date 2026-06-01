/**
 * Signup.jsx — VoxEra
 * Create an app account (SIP extension is configured separately on the softphone).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Briefcase, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DEPARTMENTS = [
  'IT Department',
  'Human Resources',
  'Plant Operations',
  'Security',
  'Administration',
  'Finance',
  'Maintenance',
  'Quality Control',
]

const VoxEraLogo = () => (
  <svg viewBox="0 0 44 44" fill="none" width="44" height="44">
    <circle cx="22" cy="22" r="10" fill="url(#sl)"/>
    <g stroke="url(#sb)" strokeWidth="2.2" strokeLinecap="round" opacity="0.9">
      <line x1="22" y1="4"  x2="22" y2="10"/>
      <line x1="22" y1="34" x2="22" y2="40"/>
      <line x1="4"  y1="22" x2="10" y2="22"/>
      <line x1="34" y1="22" x2="40" y2="22"/>
      <line x1="8.5"  y1="8.5"  x2="13" y2="13"/>
      <line x1="31"   y1="31"   x2="35.5" y2="35.5"/>
      <line x1="35.5" y1="8.5"  x2="31" y2="13"/>
      <line x1="8.5"  y1="35.5" x2="13" y2="31"/>
    </g>
    <circle cx="22" cy="22" r="3.5" fill="#FFF8EC" opacity="0.95"/>
    <defs>
      <radialGradient id="sl" cx="40%" cy="35%">
        <stop offset="0%" stopColor="#F5D34F"/>
        <stop offset="60%" stopColor="#F68529"/>
        <stop offset="100%" stopColor="#D51D25"/>
      </radialGradient>
      <linearGradient id="sb" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5D34F"/>
        <stop offset="100%" stopColor="#F68529"/>
      </linearGradient>
    </defs>
  </svg>
)

const Signup = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()

  const [form, setForm] = useState({
    name: '', email: '', password: '', department: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.department) {
      setError('All fields are required')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    const result = await signup(form.name, form.email, form.password, form.department)

    setLoading(false)
    if (result.success) {
      setSuccess(result.user)
    } else {
      setError(result.error || 'Signup failed')
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a0a00', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ background: '#2d1200', border: '1px solid rgba(245,211,79,0.2)', borderRadius: 16, padding: '2.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle size={48} color="#22c55e" />
          </div>

          <h2 style={{ color: '#F5D34F', fontWeight: 700, fontSize: '1.4rem', marginBottom: '.5rem' }}>
            Welcome, {success.name.split(' ')[0]}!
          </h2>
          <p style={{ color: '#a07850', fontSize: '.85rem', marginBottom: '2rem' }}>
            Your VoxEra account is ready. Register your SIP extension on the softphone to place calls.
          </p>

          <div style={{ background: 'rgba(245,211,79,0.05)', borderRadius: 8, padding: '.8rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ color: '#c8a87a', fontSize: '.78rem', lineHeight: 1.6 }}>
              <strong style={{ color: '#F5D34F' }}>Department:</strong> {success.department}<br/>
              <strong style={{ color: '#F5D34F' }}>Email:</strong> {success.email}
            </p>
          </div>

          <button
            onClick={() => navigate('/softphone')}
            style={{ width: '100%', background: 'linear-gradient(135deg,#D51D25,#991010)', color: '#fff', border: 'none', borderRadius: 8, padding: '.85rem', fontWeight: 600, fontSize: '.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Go to Softphone →
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a0a00', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ background: '#2d1200', border: '1px solid rgba(245,211,79,0.15)', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <VoxEraLogo />
          <div>
            <h1 style={{ color: '#F5D34F', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>VoxEra</h1>
            <p style={{ color: '#7a5530', fontSize: '.72rem', margin: 0, textTransform: 'uppercase', letterSpacing: '.1em' }}>Create Account</p>
          </div>
        </div>

        <p style={{ color: '#a07850', fontSize: '.82rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Create your account to access the dashboard and softphone. SIP extensions are configured separately on the softphone page.
        </p>

        {error && (
          <div style={{ background: 'rgba(213,29,37,0.1)', border: '1px solid rgba(213,29,37,0.25)', borderRadius: 8, padding: '.7rem .9rem', marginBottom: '1rem' }}>
            <p style={{ color: '#ef4444', fontSize: '.8rem', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'name',     label: 'Full Name', type: 'text',     icon: User, placeholder: 'e.g. Kashyap Ojha' },
            { name: 'email',    label: 'Email',     type: 'email',    icon: Mail, placeholder: 'your@email.com' },
            { name: 'password', label: 'Password',  type: 'password', icon: Lock, placeholder: '••••••••' },
          ].map(field => (
            <div key={field.name} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#c8a87a', fontSize: '.75rem', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {field.label}
              </label>
              <div style={{ position: 'relative' }}>
                <field.icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7a5530' }} />
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  disabled={loading}
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,211,79,0.12)', borderRadius: 8, color: '#fff2e0', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            </div>
          ))}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#c8a87a', fontSize: '.75rem', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Department
            </label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7a5530' }} />
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                disabled={loading}
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, background: '#2d1200', border: '1px solid rgba(245,211,79,0.12)', borderRadius: 8, color: form.department ? '#fff2e0' : '#7a5530', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">Select your department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? '#5a3a1a' : 'linear-gradient(135deg,#D51D25,#991010)', color: '#fff', border: 'none', borderRadius: 8, padding: '.85rem', fontWeight: 600, fontSize: '.9rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ color: '#5a3a1a', fontSize: '.78rem', textAlign: 'center', marginTop: '1.2rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#F68529', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Signup
