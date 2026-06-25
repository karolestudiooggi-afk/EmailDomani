import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade oficial Domani — laranja #E56D23 + grafite #1D1D1F
        brand: {
          50: '#fdf2ea',
          100: '#fbe0cd',
          200: '#f6c19c',
          300: '#f0a06a',
          400: '#eb8444',
          500: '#e56d23', // laranja oficial
          600: '#c8581a',
          700: '#a04417',
          800: '#73310f',
          900: '#3f1c0a',
        },
        graphite: '#1d1d1f', // grafite oficial
        cream: '#faf7f3',
        ink: '#1d1d1f',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,29,31,0.04), 0 10px 28px -14px rgba(29,29,31,0.16)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};
export default config;
