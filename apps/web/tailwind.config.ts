import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          hover: '#EA580C',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Legacy colors
        'color-base-bg': 'var(--color-base-bg)',
        'color-surface': 'var(--color-surface)',
        'color-text-primary': 'var(--color-text-primary)',
        'color-text-muted': 'var(--color-text-muted)',
        'color-border': 'var(--color-border)',

        // Keystay 7 Room Status Colors (Soft Tint System)
        'room-available': { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
        'room-reserved': { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
        'room-occupied': { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
        'room-checked-out': { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
        'room-cleaning': { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
        'room-maintenance': { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
        'room-out-of-order': { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
