/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* CampusLoop identity: orange primary, dark navy structure. */
        brand: {
          50: '#FFF5EF',
          100: '#FEE8DB',
          200: '#FBD3BE',
          300: '#F8B497',
          400: '#F5906B',
          500: '#F26B3A',
          600: '#DD5628',
          700: '#B74620',
          800: '#923A1D',
          900: '#772F19',
        },
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
      /* Every Tailwind `transition`/`duration` utility now reads the same
         Liquid Glass clock as the hand-written CSS: the default curve is the
         material's, and the named ones map to enter, exit and spring. */
      transitionTimingFunction: {
        DEFAULT: 'var(--motion-standard)',
        standard: 'var(--motion-standard)',
        enter: 'var(--motion-enter)',
        exit: 'var(--motion-exit)',
        spring: 'var(--motion-spring)',
      },
      transitionDuration: {
        DEFAULT: '160ms',
      },
      /* Glass never fades and never travels: it pulls focus (the lens sharpens,
         the pane settles from slightly large) and it arrives lit. */
      keyframes: {
        materialize: {
          from: {
            opacity: 0.001,
            transform: 'scale(0.966)',
            filter: 'blur(7px) brightness(1.06) saturate(1.2)',
          },
          '55%': { opacity: 1 },
          to: { opacity: 1, transform: 'none', filter: 'blur(0) brightness(1) saturate(1)' },
        },
        morph: {
          from: { opacity: 0.001, transform: 'scale(0.9)', filter: 'blur(9px) brightness(1.1)' },
          '55%': { opacity: 1 },
          to: { opacity: 1, transform: 'none', filter: 'blur(0) brightness(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        materialize: 'materialize var(--motion-lens) var(--motion-focus) both',
        morph: 'morph 320ms var(--motion-spring) both',
        /* Legacy names kept so existing call sites inherit the reference motion. */
        'fade-in': 'materialize var(--motion-lens) var(--motion-focus) both',
        'slide-up': 'morph 320ms var(--motion-spring) both',
      },
    },
  },
  plugins: [],
};
