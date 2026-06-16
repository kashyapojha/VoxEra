import { Phone } from 'lucide-react'

const LogoMark = ({ size = 'md', showWordmark = true, subtitle }) => {
  const sizes = {
    sm: { mark: 'w-8 h-8', icon: 16, title: 'text-lg', sub: 'text-[10px]' },
    md: { mark: 'w-9 h-9', icon: 18, title: 'text-xl', sub: 'text-xs' },
    lg: { mark: 'w-11 h-11', icon: 22, title: 'text-2xl', sub: 'text-xs' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className="flex items-center gap-3">
      <div className={`logo-mark ${s.mark}`}>
        <Phone size={s.icon} className="text-[var(--bg-deep)]" strokeWidth={2.5} />
      </div>
      {showWordmark && (
        <div className="flex flex-col">
          <span className={`${s.title} font-bold gradient-text leading-tight`}>VoxEra</span>
          {(subtitle || subtitle === undefined) && (
            <span className={`${s.sub} text-muted`}>{subtitle ?? 'Enterprise Communications'}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default LogoMark
