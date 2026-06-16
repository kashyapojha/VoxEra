import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Briefcase, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MeshBackground from '../components/UI/MeshBackground'
import LogoMark from '../components/UI/LogoMark'

const DEPARTMENTS = [
  'IT Department', 'Human Resources', 'Plant Operations', 'Security',
  'Administration', 'Finance', 'Maintenance', 'Quality Control',
]

const Signup = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.department) { setError('All fields are required'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')
    const result = await signup(form.name, form.email, form.password, form.department)
    setLoading(false)

    if (result.success) {
      navigate('/login', { state: { message: 'Account created! Please sign in with your credentials.' } })
    } else {
      setError(result.error || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <MeshBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card border border-[var(--border-light)]">
          <div className="flex flex-col items-center mb-6">
            <LogoMark size="lg" />
            <p className="text-muted mt-4">Create your account</p>
          </div>

          <p className="text-sm text-muted mb-6 text-center">
            Sign up first, then sign in to access the dashboard and softphone.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose mb-4 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe' },
              { name: 'email', label: 'Email Address', icon: Mail, type: 'email', placeholder: 'you@example.com' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm text-secondary mb-2">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input type={field.type} name={field.name} value={form[field.name]} onChange={handleChange} placeholder={field.placeholder} className="input-field pl-11" required disabled={loading} />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm text-secondary mb-2">Department</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <select name="department" value={form.department} onChange={handleChange} className="input-field pl-11 appearance-none" required disabled={loading}>
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {['password', 'confirmPassword'].map((name) => (
              <div key={name}>
                <label className="block text-sm text-secondary mb-2">{name === 'password' ? 'Password' : 'Confirm Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input type="password" name={name} value={form[name]} onChange={handleChange} placeholder="••••••••" className="input-field pl-11" required disabled={loading} />
                </div>
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-cyan hover:underline font-semibold">Sign in</Link>
          </div>
          <p className="text-center text-muted text-sm mt-4">
            <Link to="/" className="hover:text-white transition-colors">← Back to home</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Signup
