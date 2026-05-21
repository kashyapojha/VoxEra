/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#081120',
        primary: '#5B2EFF',
        secondary: '#4A3DFF',
        accent: '#00A6FF',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #5B2EFF 0%, #4A3DFF 40%, #00A6FF 100%)',
        'gradient-glow': 'radial-gradient(circle at center, rgba(91, 46, 255, 0.3) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(91, 46, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(91, 46, 255, 0.8), 0 0 30px rgba(0, 166, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
