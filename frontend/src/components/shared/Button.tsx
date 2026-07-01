import { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle =
    'inline-flex items-center justify-center font-medium transition-colors duration-100 outline-none select-none rounded-md border border-muted surface-hover disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none';

  const variants = {
    primary: 'bg-accent-emphasis text-fg-onAccent border-transparent hover:bg-accent-hover',
    secondary: 'bg-canvas-subtle text-fg-default',
    ghost: 'bg-transparent text-fg-default border-transparent hover:bg-canvas-subtle',
    danger: 'bg-danger-emphasis text-white border-transparent hover:bg-danger-fg',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-medium',
    md: 'px-4 py-2 text-sm font-medium',
    lg: 'px-6 py-2.5 text-base font-semibold',
  };

  // Spinner arc color must match each variant's own text color, not a single shared token —
  // primary now sits on a light accent (needs dark arc) while danger sits on a dark red
  // (needs a light arc), so a fixed color can't be right for both.
  const spinnerBorder = {
    primary: 'border-t-fg-onAccent',
    secondary: 'border-t-fg-default',
    ghost: 'border-t-fg-default',
    danger: 'border-t-white',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className={`mr-2 ${spinnerBorder[variant]} border-canvas-default`} />}
      {children}
    </button>
  );
}

export default Button;
