/**
 * QoSComponents.jsx
 * All WebRTC call quality dashboard components in one file.
 * Import individually as needed.
 *
 * Components:
 * - CallHealthBadge   : colored badge showing Excellent/Good/Fair/Poor
 * - QoSCards          : 4 metric cards (jitter, RTT, packet loss, bitrate)
 * - CodecInfo         : shows codec and ICE candidate type
 * - ICEInfo           : shows ICE candidate type with explanation
 * - BitrateGraph      : live area chart of bitrate over time
 * - JitterGraph       : live area chart of jitter over time
 * - CallQualityPanel  : full panel combining all components
 */

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity, Wifi, Radio, Zap, Shield, BarChart2 } from 'lucide-react'

// ── QUALITY COLOR HELPERS ──
const qualityColor = {
  Excellent: { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  dot: 'bg-green-400' },
  Good:      { text: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   dot: 'bg-blue-400'  },
  Fair:      { text: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  Poor:      { text: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    dot: 'bg-red-400'   },
  'N/A':     { text: 'text-gray-400',   bg: 'bg-gray-500/15',   border: 'border-gray-500/30',   dot: 'bg-gray-400'  },
}

// ── CALL HEALTH BADGE ──
/**
 * Shows a colored pill badge with the call quality level.
 * Props: quality ('Excellent'|'Good'|'Fair'|'Poor'|'N/A')
 */
export const CallHealthBadge = ({ quality = 'N/A' }) => {
  const c = qualityColor[quality] || qualityColor['N/A']
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {quality}
    </span>
  )
}

// ── QOS CARDS ──
/**
 * Four metric cards showing jitter, RTT, packet loss, bitrate.
 * Props: stats object from useWebRTCStats
 */
export const QoSCards = ({ stats }) => {
  const cards = [
    {
      label:   'Jitter',
      value:   `${stats.jitter ?? 0} ms`,
      icon:    Activity,
      color:   stats.jitter > 30 ? 'text-amber-400' : 'text-green-400',
      bg:      stats.jitter > 30 ? 'bg-amber-500/10' : 'bg-green-500/10',
      tip:     'Variation in packet arrival time. >30ms causes audio distortion.',
    },
    {
      label:   'RTT',
      value:   `${stats.rtt ?? 0} ms`,
      icon:    Wifi,
      color:   stats.rtt > 150 ? 'text-amber-400' : 'text-blue-400',
      bg:      stats.rtt > 150 ? 'bg-amber-500/10' : 'bg-blue-500/10',
      tip:     'Round Trip Time. >150ms causes noticeable conversation delay.',
    },
    {
      label:   'Packet Loss',
      value:   `${stats.packetLoss ?? 0}%`,
      icon:    Shield,
      color:   stats.packetLoss > 5 ? 'text-red-400' : 'text-green-400',
      bg:      stats.packetLoss > 5 ? 'bg-red-500/10' : 'bg-green-500/10',
      tip:     'Lost RTP packets as percentage. >5% causes audible dropouts.',
    },
    {
      label:   'Bitrate',
      value:   `${stats.bitrate ?? 0} kbps`,
      icon:    BarChart2,
      color:   'text-purple-400',
      bg:      'bg-purple-500/10',
      tip:     'Audio bitrate in kbps. Opus typically uses 24–32 kbps.',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="glass-card p-4 rounded-xl border border-white/5" title={card.tip}>
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={card.color} />
            </div>
            <p className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── CODEC INFO ──
/**
 * Shows active audio codec.
 * Props: codec (string e.g. 'OPUS')
 */
export const CodecInfo = ({ codec = 'N/A' }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
    <Radio size={14} className="text-accent" />
    <span className="text-xs text-gray-400">Codec</span>
    <span className="text-xs font-semibold text-white ml-auto font-mono">{codec}</span>
  </div>
)

// ── ICE INFO ──
/**
 * Shows ICE candidate type with human-readable explanation.
 * candidateType: 'host' | 'srflx' | 'relay'
 * Props: iceCandidateType (string)
 */
export const ICEInfo = ({ iceCandidateType = 'N/A' }) => {
  const labels = {
    host:  { label: 'Host (LAN)',       color: 'text-green-400', tip: 'Direct LAN connection — best quality' },
    srflx: { label: 'STUN (NAT)',       color: 'text-blue-400',  tip: 'NAT traversal via STUN server'        },
    relay: { label: 'TURN (Relay)',     color: 'text-amber-400', tip: 'Relayed via TURN server — higher RTT' },
    'N/A': { label: 'N/A',             color: 'text-gray-400',  tip: 'Not yet determined'                   },
  }
  const info = labels[iceCandidateType] || labels['N/A']

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5" title={info.tip}>
      <Zap size={14} className="text-accent" />
      <span className="text-xs text-gray-400">ICE</span>
      <span className={`text-xs font-semibold ml-auto font-mono ${info.color}`}>{info.label}</span>
    </div>
  )
}

// ── GRAPH COMPONENT (reusable) ──
const LiveGraph = ({ data, dataKey, color, label, unit }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-mono" style={{ color }}>
        {data.length > 0 ? `${data[data.length - 1]?.[dataKey] ?? 0} ${unit}` : `0 ${unit}`}
      </span>
    </div>
    <div className="h-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad_${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="time" stroke="#333" fontSize={9} tickFormatter={v => v.slice(3,8)} interval={9} />
          <YAxis stroke="#333" fontSize={9} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'rgba(8,17,32,.95)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, fontSize: 11 }}
            formatter={v => [`${v} ${unit}`, label]}
            labelFormatter={l => `Time: ${l}`}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad_${dataKey})`} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
)

// ── BITRATE GRAPH ──
/** Props: history (array from useWebRTCStats) */
export const BitrateGraph = ({ history = [] }) => (
  <LiveGraph data={history} dataKey="bitrate" color="#a78bfa" label="Bitrate" unit="kbps" />
)

// ── JITTER GRAPH ──
/** Props: history (array from useWebRTCStats) */
export const JitterGraph = ({ history = [] }) => (
  <LiveGraph data={history} dataKey="jitter" color="#22d3a6" label="Jitter" unit="ms" />
)

// ── RTT GRAPH ──
/** Props: history (array from useWebRTCStats) */
export const RTTGraph = ({ history = [] }) => (
  <LiveGraph data={history} dataKey="rtt" color="#4f8fff" label="RTT" unit="ms" />
)

// ── FULL CALL QUALITY PANEL ──
/**
 * Complete panel — use this on your Dashboard or Softphone page.
 * Props:
 *   stats   — from useWebRTCStats().stats
 *   history — from useWebRTCStats().history
 *   isActive — boolean, whether a call is active
 */
export const CallQualityPanel = ({ stats, history, isActive }) => {
  if (!isActive) {
    return (
      <div className="glass-card rounded-xl border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-accent" />
          <h3 className="text-sm font-semibold">Call Quality</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-32 text-gray-600">
          <Activity size={32} className="mb-2 opacity-30" />
          <p className="text-sm">No active call</p>
          <p className="text-xs mt-1">Metrics appear during calls</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl border border-white/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-accent" />
          <h3 className="text-sm font-semibold">Call Quality</h3>
        </div>
        <CallHealthBadge quality={stats.callQuality} />
      </div>

      {/* Metric Cards */}
      <QoSCards stats={stats} />

      {/* Codec + ICE */}
      <div className="grid grid-cols-2 gap-3">
        <CodecInfo codec={stats.codec} />
        <ICEInfo iceCandidateType={stats.iceCandidateType} />
      </div>

      {/* Graphs */}
      <div className="space-y-4">
        <JitterGraph history={history} />
        <RTTGraph    history={history} />
        <BitrateGraph history={history} />
      </div>
    </div>
  )
}