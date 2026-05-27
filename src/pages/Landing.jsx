import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, X } from 'lucide-react'
import { useState } from 'react'

const Landing = () => {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const navigate = useNavigate()

  // Get dynamic date
  const getFormattedDate = () => {
    const date = new Date()
    const options = { year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
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
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Phone className="text-white" size={18} />
              </div>
              <span className="text-xl font-bold gradient-text">VoIPSight</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-12">
              1 browser · 2 extensions · ∞ conversations
            </p>
          </div>

          {/* Right — Auth links */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
              Login
            </Link>
            <Link
              to="/login"
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-[0_0_40px_rgba(91,46,255,0.4)]">
                <Phone className="text-white" size={26} />
              </div>
            </div>

            {/* Name */}
            <h1 className="text-5xl lg:text-6xl font-bold mb-3 gradient-text pb-2">
              VoIPSight
            </h1>

            {/* Tagline */}
            <p className="text-base text-gray-400 mb-2 font-medium">
              One browser. Two extensions. Infinite conversations.
            </p>

            {/* Description */}
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
              Browser-based SIP softphone with live call monitoring —
              built on JsSIP, WebRTC, and Asterisk PBX.
            </p>

            {/* Sign In only */}
            <Link
              to="/login"
              className="inline-block px-8 py-3 rounded-xl bg-gradient-primary text-white font-semibold hover:shadow-[0_0_40px_rgba(91,46,255,0.6)] transition-all duration-300"
            >
              Sign In to Continue
            </Link>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-600">
            SIP · WebRTC · Asterisk · Real-Time Monitoring
          </p>
          <p className="text-xs text-gray-600">© 2026 VoIPSight</p>
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
                <p>VoIPSight ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
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
                  <li>Provide and maintain VoIPSight services</li>
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
                <p>By accessing and using VoIPSight, you accept and agree to be bound by and comply with these Terms of Service.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. Use License</h3>
                <p>Permission is granted to temporarily download one copy of the materials (information or software) on VoIPSight for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. Disclaimer</h3>
                <p>The materials on VoIPSight are provided on an 'as is' basis. VoIPSight makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Limitations</h3>
                <p>In no event shall VoIPSight or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on VoIPSight.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Accuracy of Materials</h3>
                <p>The materials appearing on VoIPSight could include technical, typographical, or photographic errors. VoIPSight does not warrant that any of the materials on VoIPSight are accurate, complete, or current.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">6. Modifications</h3>
                <p>VoIPSight may revise these Terms of Service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these Terms of Service.</p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Landing