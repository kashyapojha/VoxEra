import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MeshBackground from '../components/UI/MeshBackground'
import LogoMark from '../components/UI/LogoMark'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState(location.state?.message || '')

  useEffect(() => {
    const savedEmail = localStorage.getItem('voxera_email')
    const savedRemember = localStorage.getItem('voxera_remember')
    if (savedRemember === 'true' && savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    const result = await login(formData.email, formData.password)
    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('voxera_email', formData.email)
        localStorage.setItem('voxera_remember', 'true')
      } else {
        localStorage.removeItem('voxera_email')
        localStorage.removeItem('voxera_remember')
      }
      navigate('/dashboard')
    } else {
      setError(result.error || 'Login failed. Please try again.')
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
          <div className="flex flex-col items-center mb-8">
            <LogoMark size="lg" />
            <p className="text-muted mt-4">Sign in to your account</p>
          </div>

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-accent-mint mb-4 text-sm">
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm text-secondary mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input type="email" name="email" value={formData.email} onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setError('') }} placeholder="you@example.com" className="input-field pl-11" required />
              </div>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setError('') }} placeholder="••••••••" className="input-field pl-11 pr-11" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded bg-white/5 border-[var(--border-light)]" />
              <span className="text-sm text-muted">Remember me</span>
            </label>

            <button type="submit" className="btn-primary w-full">
              Sign In <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-accent-cyan hover:underline font-semibold">Sign up</Link>
          </div>
          <p className="text-center text-muted text-sm mt-4">
            <Link to="/" className="hover:text-white transition-colors">← Back to home</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
