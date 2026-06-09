import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, X, Star, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const Landing = () => {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackForm, setFeedbackForm] = useState({ name: '', rating: 5, message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const navigate = useNavigate()

  // Socket.io connection for real-time feedback
  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    socket.on('feedback_init', (initialFeedbacks) => {
      setFeedbacks(initialFeedbacks)
    })

    socket.on('new_feedback', (feedback) => {
      setFeedbacks(prev => [feedback, ...prev].slice(0, 20))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Get dynamic date
  const getFormattedDate = () => {
    const date = new Date()
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  // Handle feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackForm)
      })

      if (response.ok) {
        setFeedbackForm({ name: '', rating: 5, message: '' })
        setSubmitSuccess(true)
        setTimeout(() => {
          setSubmitSuccess(false)
          setShowFeedback(false)
        }, 1500)
      }
    } catch (err) {
      console.error('Feedback submission error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* NAV */}
      <nav className="relative z-10 glass border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Left — Logo + tagline */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <img src="/voxera-logo.png" alt="VoxEra Logo" className="w-24 h-24" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold gradient-text">VoxEra</span>
                <span className="text-xs text-gray-400">Enterprise Communications</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2 ml-12">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">VoIP</span>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">SIP</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/30">WebRTC</span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">RTP</span>
            </div>
          </div>

          {/* Right — Auth links */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFeedback(true)}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Feedback
            </button>
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — vertically centered in remaining space */}
      <main className="relative z-10 flex-1 flex items-center justify-center">
        <section className="max-w-xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Logo icon */}
            <div className="flex justify-center mb-5">
              <img src="/voxera-logo.png" alt="VoxEra Logo" className="w-64 h-64" />
            </div>

            {/* Name */}
            <h1 className="text-5xl lg:text-6xl font-bold mb-3 gradient-text pb-2">
              VoxEra
            </h1>

            {/* Tagline */}
            <p className="text-base text-gray-400 mb-2 font-medium">
              Enterprise Communications
            </p>

            {/* Tech tags */}
            <div className="flex justify-center gap-2 mb-4">
              <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">VoIP</span>
              <span className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">SIP</span>
              <span className="text-xs px-3 py-1 rounded-full bg-secondary/20 text-secondary border border-secondary/30">WebRTC</span>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">RTP</span>
            </div>

            <p className="text-sm text-gray-500 mb-2">
              One browser. Two extensions. Infinite conversations.
            </p>

            {/* Description */}
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
              Browser-based SIP softphone with live call monitoring —
              built on JsSIP, WebRTC, and Asterisk PBX.
            </p>

            {/* Auth CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="inline-block px-8 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_40px_rgba(91,46,255,0.6)] transition-all duration-300"
              >
                Get Started — Sign Up
              </Link>
              <Link
                to="/login"
                className="inline-block px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-all duration-300"
              >
                Sign In
              </Link>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              New here? Create an account first, then sign in.
            </p>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-600">
            SIP · WebRTC · Asterisk · Real-Time Monitoring
          </p>
          <p className="text-xs text-gray-600">© 2026 VoxEra</p>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPrivacy(true)} 
              className="text-gray-600 hover:text-gray-400 transition-colors text-xs cursor-pointer"
            >
              Privacy
            </button>
            <button 
              onClick={() => setShowTerms(true)} 
              className="text-gray-600 hover:text-gray-400 transition-colors text-xs cursor-pointer"
            >
              Terms
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto p-8 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacy(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 text-gray-300 text-sm">
              <p><strong>Last Updated:</strong> {getFormattedDate()}</p>
              
              <section>
                <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
                <p>VoxEra ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. Information We Collect</h3>
                <p>We collect information you provide directly, such as:</p>
                <ul className="list-disc pl-5 mt-2">
                  <li>Email address and password for account creation</li>
                  <li>SIP account credentials (for softphone functionality)</li>
                  <li>Call history and metadata</li>
                  <li>Real-time monitoring data</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. How We Use Your Information</h3>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-5 mt-2">
                  <li>Provide and maintain VoxEra services</li>
                  <li>Authenticate users and prevent fraud</li>
                  <li>Generate analytics and reports</li>
                  <li>Improve our services</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Data Security</h3>
                <p>We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Your Rights</h3>
                <p>You have the right to access, update, or delete your personal information. Please contact us for any privacy-related requests.</p>
              </section>
            </div>
          </motion.div>
        </div>
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto p-8 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Terms of Service</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 text-gray-300 text-sm">
              <p><strong>Last Updated:</strong> {getFormattedDate()}</p>
              
              <section>
                <h3 className="text-lg font-semibold mb-2">1. Agreement to Terms</h3>
                <p>By accessing and using VoxEra, you accept and agree to be bound by and comply with these Terms of Service.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. Use License</h3>
                <p>Permission is granted to temporarily download one copy of the materials (information or software) on VoxEra for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. Disclaimer</h3>
                <p>The materials on VoxEra are provided on an 'as is' basis. VoxEra makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Limitations</h3>
                <p>In no event shall VoxEra or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on VoxEra.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Accuracy of Materials</h3>
                <p>The materials appearing on VoxEra could include technical, typographical, or photographic errors. VoxEra does not warrant that any of the materials on VoxEra are accurate, complete, or current.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">6. Modifications</h3>
                <p>VoxEra may revise these Terms of Service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these Terms of Service.</p>
              </section>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-2xl max-w-md w-full p-8 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Share Your Feedback</h2>
              <button
                onClick={() => setShowFeedback(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={feedbackForm.name}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Star
                        size={24}
                        className={star <= feedbackForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  placeholder="Share your experience with VoxEra..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-accent/50 transition-colors resize-none"
                  required
                  maxLength={200}
                />
              </div>
              {submitSuccess && (
                <p className="text-sm text-green-400 text-center">Thank you! Your feedback was saved.</p>
              )}
              <button
                type="submit"
                disabled={isSubmitting || submitSuccess}
                className="w-full py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_30px_rgba(91,46,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : submitSuccess ? 'Saved!' : 'Submit Feedback'}
                {!isSubmitting && !submitSuccess && <Send size={20} />}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Floating Feedback Cards */}
      {feedbacks.map((feedback, index) => (
        <motion.div
          key={feedback.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, delay: index * 0.5 }}
          className="fixed glass rounded-xl p-4 border border-white/10 z-20 max-w-xs"
          style={{
            top: `${10 + (index % 3) * 20}%`,
            left: `${10 + (index % 4) * 20}%`,
            animation: `fadeInOut 8s forwards ${index * 2}s`
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
              {feedback.initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{feedback.name}</span>
                <div className="flex">
                  {[...Array(feedback.rating)].map((_, i) => (
                    <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-300">{feedback.message}</p>
            </div>
          </div>
        </motion.div>
      ))}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          12.5% { opacity: 1; transform: scale(1); }
          62.5% { opacity: 1; transform: scale(1); }
          75% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

export default Landing