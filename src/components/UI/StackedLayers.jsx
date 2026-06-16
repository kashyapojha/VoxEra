import { Activity, BarChart3, Phone, Radio, Wifi } from 'lucide-react'

const BADGE_COLORS = {
  mint: 'bg-accent-mint/10 text-accent-mint border-accent-mint/20',
  cyan: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
  rose: 'bg-accent-rose/10 text-accent-rose border-accent-rose/20',
  amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
}

const DEFAULT_LAYERS = [
  { icon: Phone, title: 'SIP Registration', subtitle: 'JsSIP over WebSocket', badge: 'LIVE', accent: 'mint' },
  { icon: Radio, title: 'RTP Media Stream', subtitle: 'Opus codec · DTLS-SRTP', badge: 'ACTIVE', accent: 'cyan' },
  { icon: BarChart3, title: 'Call Analytics', subtitle: 'Real-time metrics', badge: 'SYNC', accent: 'violet' },
  { icon: Wifi, title: 'Network QoS', subtitle: 'Jitter · RTT · Loss', badge: 'MONITOR', accent: 'rose' },
  { icon: Activity, title: 'Asterisk PBX', subtitle: 'PJSIP dialplan', badge: 'READY', accent: 'amber' },
]

const StackedLayers = ({ layers = DEFAULT_LAYERS }) => {
  const count = layers.length
  const height = 56 + (count - 1) * 52

  return (
    <div className="relative w-full max-w-md mx-auto" style={{ height: `${height}px`, perspective: '900px' }}>
      {layers.map((layer, i) => {
        const Icon = layer.icon
        const top = i * 52
        const rotateX = 18 - i * 3
        const zIndex = count - i
        const badgeCls = BADGE_COLORS[layer.accent] || BADGE_COLORS.cyan

        return (
          <div
            key={layer.title}
            className="stack-layer"
            style={{
              top: `${top}px`,
              zIndex,
              transform: `rotateX(${rotateX}deg) translateZ(${-i * 8}px)`,
              opacity: 1 - i * 0.06,
            }}
          >
            <div className={`icon-badge icon-badge-${layer.accent}`}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{layer.title}</div>
              <div className="text-muted text-xs truncate">{layer.subtitle}</div>
            </div>
            <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${badgeCls}`}>
              {layer.badge}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default StackedLayers
