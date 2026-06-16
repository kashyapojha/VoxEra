const ACCENTS = ['mint', 'cyan', 'violet', 'rose', 'amber']

const FloatingStatCard = ({ label, value, accent = 'cyan', style = {}, delay = 0 }) => {
  const glow = ACCENTS.includes(accent) ? accent : 'cyan'
  return (
    <div
      className={`float-stat-card glow-${glow}`}
      style={{ ...style, animationDelay: `${delay}s` }}
    >
      <div className="float-label">{label}</div>
      <div className="float-value">{value}</div>
    </div>
  )
}

export default FloatingStatCard
