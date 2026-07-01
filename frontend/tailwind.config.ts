/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          default: 'var(--color-canvas-default)',
          subtle:  'var(--color-canvas-subtle)',
          inset:   'var(--color-canvas-inset)',
        },
        fg: {
          default: 'var(--color-fg-default)',
          muted:   'var(--color-fg-muted)',
          subtle:  'var(--color-fg-subtle)',
          onEmphasis: 'var(--color-fg-on-emphasis)',
          onAccent: 'var(--color-fg-on-accent)',
        },
        neutral: {
          50:  'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        success: { fg: 'var(--color-success-fg)', emphasis: 'var(--color-success-emphasis)' },
        attention: { fg: 'var(--color-attention-fg)', emphasis: 'var(--color-attention-emphasis)' },
        danger: { fg: 'var(--color-danger-fg)', emphasis: 'var(--color-danger-emphasis)' },
        accent: {
          emphasis: 'var(--color-accent-emphasis)',
          hover:    'var(--color-accent-emphasis-hover)',
          subtle:   'var(--color-accent-subtle)',
          faded:    'var(--color-accent-faded)',
        },
      },
      // Separate namespaces (not nested under `colors`) so the generated class names are
      // `border-default`/`border-muted`/`divide-default`/`divide-muted` — nesting these under
      // `colors.border` instead generates `border-border-default` (colors.<key> path prefixed
      // by the border- utility), which silently doesn't match any class actually used in JSX.
      borderColor: {
        default: 'var(--color-border-default)',
        muted:   'var(--color-border-muted)',
        subtle:  'var(--color-border-subtle)',
      },
      divideColor: {
        default: 'var(--color-border-default)',
        muted:   'var(--color-border-muted)',
        subtle:  'var(--color-border-subtle)',
      },
      // Governs the bare `border`/`border-t`/`border-b`/`border-r`/`border-l` utilities
      // app-wide (explicit widths like `border-2`/`border-l-4` are unaffected).
      borderWidth: {
        DEFAULT: '2px',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-medium)',
        small: 'var(--radius-small)',
        medium: 'var(--radius-medium)',
        large: 'var(--radius-large)',
      },
      boxShadow: {
        'elevation-small':  'var(--shadow-small)',
        'elevation-medium': 'var(--shadow-medium)',
        'elevation-large':  'var(--shadow-large)',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Noto Sans',
          'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"',
        ],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
