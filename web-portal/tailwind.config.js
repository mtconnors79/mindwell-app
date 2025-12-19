/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SoulBloom Brand Colors
        primary: {
          DEFAULT: '#355F5B',
          50: '#E8F0EF',
          100: '#D1E1DF',
          200: '#A3C3BF',
          300: '#75A59F',
          400: '#47877F',
          500: '#355F5B',
          600: '#2A4C49',
          700: '#203937',
          800: '#152624',
          900: '#0B1312',
        },
        background: '#F7F5F2',
        surface: '#EFEAF6',
        card: '#D8D1E6',
        'text-primary': '#2F3E3C',
        'text-secondary': '#8FA4B3',
        accent: '#C6B7D8',
        success: '#AFC8C5',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
