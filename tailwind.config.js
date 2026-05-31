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
        primary: '#B8100F',
        secondary: '#96720A',
        accent: '#C8960A',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #B8100F 0%, #96720A 40%, #C8960A 100%)',
        'gradient-glow': 'radial-gradient(circle at center, rgba(184, 16, 15, 0.3) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(184, 16, 15, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(184, 16, 15, 0.8), 0 0 30px rgba(200, 150, 10, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
