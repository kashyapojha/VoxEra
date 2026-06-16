import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Star, Send, Phone, Radio, BarChart3, Shield, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import MeshBackground from '../components/UI/MeshBackground'
import LogoMark from '../components/UI/LogoMark'
import HeroVisual from '../components/UI/HeroVisual'
import TiltCard from '../components/UI/TiltCard'
import StackedLayers from '../components/UI/StackedLayers'
import FloatingStatCard from '../components/UI/FloatingStatCard'
import SectionHeader from '../components/UI/SectionHeader'

const FEATURES = [
  { icon: Phone, title: 'Browser Softphone', description: 'Make and receive SIP calls directly in Chrome or Edge — no plugins, no downloads.', accent: 'mint' },
  { icon: Radio, title: 'WebRTC Audio', description: 'Opus codec with DTLS-SRTP encryption. Crystal-clear voice over Asterisk PBX.', accent: 'cyan' },
  { icon: BarChart3, title: 'Live Analytics', description: 'Real-time call history, active sessions, and bandwidth charts via Socket.io.', accent: 'violet' },
  { icon: Shield, title: 'QoS Monitoring', description: 'Jitter, RTT, packet loss, and call quality scores polled every second.', accent: 'rose' },
  { icon: Zap, title: 'Instant Deploy', description: 'Docker Compose full stack with CI/CD to AWS EC2 via GitHub Actions.', accent: 'amber' },
]

const METRICS = [
  { value: '2', label: 'SIP Extensions' },
  { value: '<50ms', label: 'Avg RTT' },
  { value: '24/7', label: 'Monitoring' },
  { value: '100%', label: 'Browser-based' },
]

const Landing = () => {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackForm, setFeedbackForm] = useState({ name: '', rating: 5, message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] })
    socket.on('feedback_init', (initial) => setFeedbacks(initial))
    socket.on('new_feedback', (fb) => setFeedbacks((prev) => [fb, ...prev].slice(0, 20)))
    return () => socket.disconnect()
  }, [])

  const getFormattedDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackForm),
      })
      if (res.ok) {
        setFeedbackForm({ name: '', rating: 5, message: '' })
        setSubmitSuccess(true)
        setTimeout(() => { setSubmitSuccess(false); setShowFeedback(false) }, 1500)
      }
    } catch (err) {
      console.error('Feedback error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <MeshBackground />

      {/* ── Sticky nav ── */}
      <nav className="glass-nav sticky top-0 z-50 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <LogoMark size="md" />
          <div className="flex items-center gap-3">
            <span className="status-pill hidden sm:inline-flex">
              <span className="live-dot" />
              System online
            </span>
            <button onClick={() => setShowFeedback(true)} className="text-muted hover:text-white text-sm transition-colors">
              Feedback
            </button>
            <Link to="/login" className="text-muted hover:text-white text-sm transition-colors hidden sm:inline">
              Login
            </Link>
            <Link to="/signup" className="btn-primary !py-2 !px-5 !text-xs">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border-light)] bg-white/[0.03] text-xs font-mono text-accent-cyan mb-6">
              <span className="live-dot" />
              VoIP · SIP · WebRTC
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
              <span className="gradient-text">Enterprise voice</span>
              <br />
              <span className="text-white">in your </span>
              <span className="gradient-text-warm">browser</span>
            </h1>

            <p className="text-muted text-lg leading-relaxed mb-8 max-w-lg">
              Browser-based SIP softphone with live call monitoring — built on JsSIP, WebRTC, and Asterisk PBX.
            </p>

            <div className="flex flex-wrap gap-4 mb-6">
              <Link to="/signup" className="btn-primary">Get Started</Link>
              <Link to="/login" className="btn-ghost">Sign In</Link>
            </div>
            <p className="text-xs text-muted">New here? Create an account first, then sign in.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <FloatingStatCard label="Active calls" value="3" accent="mint" style={{ top: '5%', right: '0%' }} delay={0} />
            <FloatingStatCard label="Uptime" value="99.9%" accent="cyan" style={{ top: '35%', left: '-5%' }} delay={1.2} />
            <FloatingStatCard label="QoS score" value="94" accent="violet" style={{ bottom: '15%', right: '5%' }} delay={2.4} />
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ── Metrics strip ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 mb-20">
        <div className="glass rounded-2xl border border-[var(--border-light)] grid grid-cols-2 md:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="metric-cell">
              <span className="metric-value">{m.value}</span>
              <span className="metric-label">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features (tilt cards) ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <SectionHeader
          tag="Capabilities"
          title={<>Everything you need for <span className="gradient-text">VoIP ops</span></>}
          description="From SIP registration to real-time QoS — VoxEra covers the full call lifecycle in one dashboard."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <TiltCard key={f.title} index={i + 1} {...f} />
          ))}
        </div>
      </section>

      {/* ── Stack diagram (alternating layout) ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <SectionHeader
            tag="Architecture"
            title="Layered call pipeline"
            description="SIP signaling, RTP media, analytics, and monitoring — stacked and synchronized in real time."
            className="mb-0"
          />
          <StackedLayers />
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="cta-band">
          <div className="pulse-rings">
            <div className="pulse-ring" />
            <div className="pulse-ring" />
            <div className="pulse-ring" />
          </div>
          <div className="relative z-10">
            <div className="section-tag justify-center">Ready to start</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Launch your softphone</span> today
            </h2>
            <p className="text-muted mb-8 max-w-md mx-auto">
              Sign up, register your SIP extension, and start calling in under two minutes.
            </p>
            <Link to="/signup" className="btn-primary">Create Free Account</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <LogoMark size="sm" />
          <div className="flex items-center gap-6 text-xs text-muted">
            <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => setShowFeedback(true)} className="hover:text-white transition-colors">Feedback</button>
          </div>
          <p className="text-xs text-muted">© 2026 VoxEra</p>
        </div>
      </footer>

      {/* Floating feedback toasts */}
      {feedbacks.slice(0, 4).map((fb, i) => (
        <div
          key={fb.id}
          className="float-stat-card glow-cyan !max-w-xs !p-4 z-20"
          style={{
            top: `${12 + (i % 2) * 18}%`,
            left: `${8 + i * 12}%`,
            animation: `fadeInOut 10s forwards ${i * 2.5}s`,
            position: 'fixed',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="logo-mark w-8 h-8 text-xs font-bold">{fb.initials}</div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="font-semibold text-sm">{fb.name}</span>
                {[...Array(fb.rating)].map((_, j) => (
                  <Star key={j} size={10} className="fill-accent-amber text-accent-amber" />
                ))}
              </div>
              <p className="text-xs text-secondary">{fb.message}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Modals */}
      {showPrivacy && <LegalModal title="Privacy Policy" date={getFormattedDate()} onClose={() => setShowPrivacy(false)} />}
      {showTerms && <LegalModal title="Terms of Service" date={getFormattedDate()} onClose={() => setShowTerms(false)} />}

      {showFeedback && (
        <ModalShell onClose={() => setShowFeedback(false)}>
          <h2 className="text-2xl font-bold mb-6">Share Your Feedback</h2>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-secondary mb-2">Your Name</label>
              <input type="text" value={feedbackForm.name} onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm text-secondary mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setFeedbackForm({ ...feedbackForm, rating: s })} className="p-1">
                    <Star size={22} className={s <= feedbackForm.rating ? 'fill-accent-amber text-accent-amber' : 'text-muted'} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-secondary mb-2">Message</label>
              <textarea value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} rows={4} maxLength={200} className="input-field resize-none" required />
            </div>
            {submitSuccess && <p className="text-sm text-accent-mint text-center">Thank you!</p>}
            <button type="submit" disabled={isSubmitting || submitSuccess} className="btn-primary w-full">
              {isSubmitting ? 'Submitting...' : submitSuccess ? 'Saved!' : 'Submit Feedback'}
              {!isSubmitting && !submitSuccess && <Send size={18} />}
            </button>
          </form>
        </ModalShell>
      )}
    </div>
  )
}

const ModalShell = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card max-w-md w-full border border-[var(--border-light)] relative">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg text-muted hover:text-white transition-colors">
        <X size={20} />
      </button>
      {children}
    </motion.div>
  </div>
)

const LegalModal = ({ title, date, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto border border-[var(--border-light)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={22} /></button>
      </div>
      <div className="space-y-4 text-secondary text-sm">
        <p><strong className="text-white">Last Updated:</strong> {date}</p>
        <p>VoxEra respects your privacy and provides enterprise communications services under these terms. Contact the development team for full legal documentation.</p>
      </div>
    </motion.div>
  </div>
)

export default Landing
