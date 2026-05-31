import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('voipsight_email')
    const savedPassword = localStorage.getItem('voipsight_password')
    const savedRemember = localStorage.getItem('voipsight_remember')
    
    if (savedRemember === 'true' && savedEmail && savedPassword) {
      setFormData({
        email: savedEmail,
        password: savedPassword
      })
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(formData.email, formData.password)

    setIsLoading(false)

    if (result.success) {
      // Save or clear credentials based on remember me
      if (rememberMe) {
        localStorage.setItem('voipsight_email', formData.email)
        localStorage.setItem('voipsight_password', formData.password)
        localStorage.setItem('voipsight_remember', 'true')
      } else {
        localStorage.removeItem('voipsight_email')
        localStorage.removeItem('voipsight_password')
        localStorage.removeItem('voipsight_remember')
      }
      navigate('/dashboard')
    } else {
      setError(result.error || 'Login failed. Please try again.')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSignUpChange = (e) => {
    setSignUpData({
      ...signUpData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (signUpData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${window.location.origin}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpData.name,
          email: signUpData.email,
          password: signUpData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        setError('')
        setFormData({ email: signUpData.email, password: signUpData.password })
        setIsSignUp(false)
        setSignUpData({ name: '', email: '', password: '', confirmPassword: '' })
        alert('Account created successfully! Please log in.')
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch (err) {
      setError('Signup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="/birlateams-logo.png" alt="BirlaTeams Logo" className="w-48 h-48 mb-4" />
            <h1 className="text-3xl font-bold gradient-text mb-1">BirlaTeams</h1>
            <p className="text-sm text-gray-400 mb-2">Enterprise Communications</p>
            <div className="flex gap-2 mb-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">VoIP</span>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">SIP</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/30">WebRTC</span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">RTP</span>
            </div>
            <p className="text-gray-400 mt-2">{isSignUp ? 'Create your account' : 'Sign in to your account'}</p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-400">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={signUpData.name}
                    onChange={handleSignUpChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={isSignUp ? signUpData.email : formData.email}
                  onChange={isSignUp ? handleSignUpChange : handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={isSignUp ? signUpData.password : formData.password}
                  onChange={isSignUp ? handleSignUpChange : handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={signUpData.confirmPassword}
                    onChange={handleSignUpChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 cursor-pointer" 
                  />
                  <span className="text-sm text-gray-400">Remember me</span>
                </label>
                <a href="#" className="text-sm text-accent hover:underline">
                  Forgot password?
                </a>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
              {!isLoading && <ArrowRight size={20} />}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setFormData({ email: '', password: '' })
                  setSignUpData({ name: '', email: '', password: '', confirmPassword: '' })
                }} 
                className="text-accent hover:underline cursor-pointer font-semibold"
              >
                {isSignUp ? 'Sign In' : 'Sign up'}
              </button>
            </p>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            © 2026 BirlaTeams. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
