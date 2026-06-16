/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'var(--bg-deep)',
        surface: 'var(--bg-base)',
        elevated: 'var(--bg-surface)',
        muted: 'var(--text-muted)',
        accent: {
          mint: 'var(--accent-mint)',
          cyan: 'var(--accent-cyan)',
          violet: 'var(--accent-violet)',
          rose: 'var(--accent-rose)',
          amber: 'var(--accent-amber)',
          DEFAULT: 'var(--accent-cyan)',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--accent-mint) 0%, var(--accent-cyan) 45%, var(--accent-violet) 100%)',
        'gradient-warm': 'linear-gradient(135deg, var(--accent-rose) 0%, var(--accent-violet) 50%, var(--accent-cyan) 100%)',
        'gradient-glow': 'radial-gradient(circle at center, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
        'mesh-hero': 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(94, 234, 212, 0.12) 0%, transparent 50%), radial-gradient(ellipse 70% 50% at 80% 20%, rgba(167, 139, 250, 0.10) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 50% 80%, rgba(34, 211, 238, 0.08) 0%, transparent 50%)',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 5s ease-in-out 1.5s infinite',
        'pulse-ring': 'pulse-ring 4s ease-in-out infinite',
        'pulse-ring-delayed': 'pulse-ring 4s ease-in-out 1.3s infinite',
        'blink-live': 'blink-live 2s ease-in-out infinite',
        'mesh-drift': 'mesh-drift 20s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '0.15' },
          '100%': { transform: 'scale(0.85)', opacity: '0.6' },
        },
        'blink-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'mesh-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(2%, -1%) scale(1.02)' },
          '66%': { transform: 'translate(-1%, 2%) scale(0.98)' },
        },
      },
      boxShadow: {
        'glow-mint': '0 0 24px rgba(94, 234, 212, 0.25), 0 0 48px rgba(94, 234, 212, 0.1)',
        'glow-cyan': '0 0 24px rgba(34, 211, 238, 0.25), 0 0 48px rgba(34, 211, 238, 0.1)',
        'glow-violet': '0 0 24px rgba(167, 139, 250, 0.25), 0 0 48px rgba(167, 139, 250, 0.1)',
        'glow-rose': '0 0 24px rgba(251, 113, 133, 0.25), 0 0 48px rgba(251, 113, 133, 0.1)',
        'glow-amber': '0 0 24px rgba(251, 191, 36, 0.25), 0 0 48px rgba(251, 191, 36, 0.1)',
        'btn-primary': '0 4px 24px rgba(34, 211, 238, 0.35), 0 0 40px rgba(94, 234, 212, 0.15)',
        'btn-primary-hover': '0 8px 32px rgba(34, 211, 238, 0.5), 0 0 60px rgba(167, 139, 250, 0.25)',
      },
    },
  },
  plugins: [],
}
