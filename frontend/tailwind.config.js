/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* CampusLoop identity: purple primary, blue secondary. */
        brand: {
          50: '#F4F1FF',
          100: '#EAE4FF',
          200: '#D6CBFF',
          300: '#B8A3FF',
          400: '#8F71FF',
          500: '#6D4AFF',
          600: '#5B36E8',
          700: '#4A29C2',
          800: '#3B219B',
          900: '#2E1B78',
        },
        info: '#3B82F6',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        navy: '#1B2A40',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        brand: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        control: '11px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 42, 64, 0.04), 0 8px 24px -20px rgba(27, 42, 64, 0.22)',
        lift: '0 14px 32px -20px rgba(27, 42, 64, 0.28)',
        focus: '0 0 0 3px rgba(242, 107, 58, 0.22)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 240ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
