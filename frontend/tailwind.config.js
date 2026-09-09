/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0b0f19',
          900: '#111827',
          850: '#151e32',
          800: '#1f293d',
          700: '#334155',
          600: '#475569'
        },
        trade: {
          buy: '#10b981',      // Emerald green
          buyDark: '#047857',
          sell: '#f43f5e',     // Rose / red
          sellDark: '#be123c',
          accent: '#06b6d4',   // Cyan / bot accent
          warning: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
