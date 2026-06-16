import useTilt from '../../hooks/useTilt'

const ACCENT_MAP = {
  mint: 'icon-badge-mint tilt-accent-mint',
  cyan: 'icon-badge-cyan tilt-accent-cyan',
  violet: 'icon-badge-violet tilt-accent-violet',
  rose: 'icon-badge-rose tilt-accent-rose',
  amber: 'icon-badge-amber tilt-accent-amber',
}

const TiltCard = ({ index, icon: Icon, title, description, accent = 'cyan', className = '' }) => {
  const { ref, onMouseMove, onMouseLeave } = useTilt(10, 6)
  const accentCls = ACCENT_MAP[accent] || ACCENT_MAP.cyan

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`tilt-card ${accentCls.split(' ')[1]} ${className}`}
      style={{ transition: 'transform 0.15s ease-out, box-shadow 0.3s ease, border-color 0.3s ease' }}
    >
      <div className="tilt-card-index font-mono">0{index}</div>
      <div className={`icon-badge mb-4 ${accentCls.split(' ')[0]}`}>
        {Icon && <Icon size={22} />}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{description}</p>
    </div>
  )
}

export default TiltCard
