/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2B5FC0',
          gold: '#D4A017',
          navy: '#0D1B4B',
          white: '#FFFFFF',
          light: '#F0F4FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '20px',
        pill: '50px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(13, 27, 75, 0.08)',
        'glass-hover': '0 12px 40px rgba(13, 27, 75, 0.12)',
      },
    },
  },
  plugins: [],
}
