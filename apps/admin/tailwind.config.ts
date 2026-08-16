import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#14342B',
        green: {
          50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC',
          400: '#4ADE80', 500: '#2D6A4F', 600: '#1B4332', 700: '#14342B',
          800: '#0D2318', 900: '#06120C',
        },
        mint: '#D8F3DC', tint: '#F0FDF4', bg: '#F7FAF8', text: '#1A1A1A', muted: '#6B7280',
      },
      fontFamily: {
        heading: ['var(--font-lora)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { app: '1440px' },
    },
  },
  plugins: [],
};

export default config;
