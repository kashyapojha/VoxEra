import { motion } from 'framer-motion'

const GlassCard = ({ children, className = '', hover = false, glow = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        glass-card
        ${hover ? 'neon-glow-hover transition-all duration-300 cursor-pointer' : ''}
        ${glow ? 'neon-glow' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

export default GlassCard
