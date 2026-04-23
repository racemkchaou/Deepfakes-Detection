/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: { 950: '#020617', 900: '#0f172a', 800: '#1e293b', 700: '#334155' },
        accent: { DEFAULT: '#6366f1', hover: '#4f46e5', glow: '#818cf8' },
        real: { DEFAULT: '#10b981', light: '#d1fae5' },
        fake: { DEFAULT: '#ef4444', light: '#fee2e2' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7' },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.35)',
      },
    },
  },
  plugins: [],
};
