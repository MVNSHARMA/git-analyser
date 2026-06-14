/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff5f2',
          100: '#ffe5dd',
          200: '#ffcfc4',
          300: '#ffa796',
          400: '#ff745c',
          500: '#DD614C',   // primary terracotta red
          600: '#c54d39',
          700: '#a53d2c',
          800: '#893325',
          900: '#722e23',
          950: '#3f150f',
        },
        secondary: '#DAA144',
        ink: '#111827',
        surface: {
          DEFAULT: '#FFFFFF',
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          800: '#FFFFFF',
          900: '#FFFFFF',
        },
        error: '#DC2626',
        success: '#16A34A',
        warning: '#D97706',
      },
      fontFamily: {
        sans:  ["'Darker Grotesque'", 'sans-serif'],
        mono:  ["'JetBrains Mono'", 'monospace'],
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
