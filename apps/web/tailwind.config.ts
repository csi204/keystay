import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
        },
        'color-base-bg': '#FAFAF9',
        'color-surface': '#FFFFFF',
        'color-text-primary': '#1E293B',
        'color-text-muted': '#64748B',
        'color-border': '#E2E8F0',
        'room-available': { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
        'room-reserved': { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
        'room-occupied': { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        'room-checked-out': { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' },
        'room-cleaning': { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
        'room-maintenance': { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
        'room-out-of-order': { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
      },
      fontFamily: {
        sans: ['Inter', 'Sarabun', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
