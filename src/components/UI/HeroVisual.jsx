import { UserPlus, Hash, Phone, MessageCircle, Video } from 'lucide-react'

const HeroVisual = () => (
  <div className="hero-visual-wrap w-full max-w-sm mx-auto">
    <div className="hero-visual">
      <div className="glass-card p-6 border border-[var(--border-light)] neon-glow">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-xs font-mono text-accent-mint uppercase tracking-widest">
              Workflow
            </span>
          </div>
          <span className="font-mono text-xs text-muted">ext • mock</span>
        </div>

        {/* Top pill — headline summary */}
        <div className="rounded-2xl bg-elevated border border-subtle p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted">
              VoxEra web journey
            </span>
            <span className="text-[11px] font-mono text-accent-mint">4 steps</span>
          </div>
          <p className="text-xs text-secondary">
            Placeholder animation showing how a user moves from signup to mutual follow,
            then into chat, voice, and video.
          </p>
        </div>

        {/* Vertical workflow steps */}
        <div className="space-y-3">
          <WorkflowStep
            index="01"
            icon={UserPlus}
            title="Sign up / Log in"
            detail="User lands on VoxEra, creates an account or authenticates into the workspace."
          />
          <WorkflowStep
            index="02"
            icon={Hash}
            title="Receive 4‑digit extension"
            detail="Platform assigns a unique extension (e.g. 1037) mapped to the profile."
          />
          <WorkflowStep
            index="03"
            icon={Phone}
            title="Send follow request"
            detail="User sends a follow request; once both peers follow, the link is trusted."
          />
          <WorkflowStep
            index="04"
            icon={Video}
            title="Chat · Voice · Video"
            detail="Mutual followers can communicate via chat, voice, or video from VoxEra."
            trailingIcon={MessageCircle}
          />
        </div>

        {/* Animated progress bar indicating continuous flow */}
        <div className="mt-5">
          <div className="flex justify-between text-[10px] text-muted mb-1">
            <span>Workflow loop</span>
            <span className="font-mono text-accent-mint">user ⇄ extension ⇄ peers</span>
          </div>
          <div className="progress-bar overflow-hidden">
            <div
              className="progress-bar-fill"
              style={{
                width: '100%',
                animation: 'gaugeFlow 6s ease-in-out infinite',
                transformOrigin: '0 50%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
    <div className="hero-shadow" />
  </div>
)

const WorkflowStep = ({ index, icon: Icon, title, detail, trailingIcon: Trailing }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center pt-1">
      <span className="text-[10px] font-mono text-muted mb-1">{index}</span>
      <span className="w-8 h-8 rounded-full bg-white/[0.03] border border-subtle flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
        <Icon size={14} className="text-accent-cyan" />
      </span>
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-semibold">{title}</p>
        {Trailing && (
          <Trailing size={14} className="text-accent-mint hidden sm:inline-block" />
        )}
      </div>
      <p className="text-[11px] text-muted leading-snug">{detail}</p>
    </div>
  </div>
)

export default HeroVisual
