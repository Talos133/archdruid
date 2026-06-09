import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:  '#0a0818',
          mid:   '#130d2e',
          upper: '#0e1225',
        },
        accent: {
          purple: '#a78bfa',
          blue:   '#60a5fa',
        },
        source: {
          github: '#f97316',
          arxiv:  '#a78bfa',
          so:     '#facc15',
          reddit: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '20px',
      },
    },
  },
}

export default config
