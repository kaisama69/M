/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: '#09080f',
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        primary: {
          DEFAULT: '#8b5cf6',
          glow: 'rgba(139, 92, 246, 0.35)',
        },
        positive: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.35)',
        },
        negative: {
          DEFAULT: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.35)',
        },
        neutral: {
          DEFAULT: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.35)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      animation: {
        'float-slow': 'float 25s infinite alternate',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(5%, 10%) scale(1.1)' },
          '100%': { transform: 'translate(-5%, -5%) scale(0.9)' },
        }
      }
    },
  },
  plugins: [],
}
