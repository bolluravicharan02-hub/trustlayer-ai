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
        background: '#0B0F19',
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          800: '#111827',
          900: '#0B0F19',
          950: '#060911',
        },
        navy: {
          800: '#0F172A',
          900: '#0A0F1D',
          950: '#050811',
        },
        accent: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          teal: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}

