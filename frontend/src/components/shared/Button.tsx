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
    'inline-flex items-center justify-center font-medium transition-colors duration-100 outline-none select-none rounded-md border border-default surface-hover disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none';

  const variants = {
    primary: 'bg-accent-emphasis text-fg-onEmphasis border-transparent hover:bg-accent-hover',
    secondary: 'bg-canvas-default text-fg-default hover:bg-canvas-subtle',
    ghost: 'bg-transparent text-fg-default border-transparent hover:bg-canvas-subtle',
    danger: 'bg-danger-emphasis text-white border-transparent hover:bg-danger-fg',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-medium',
    md: 'px-4 py-2 text-sm font-medium',
    lg: 'px-6 py-2.5 text-base font-semibold',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2 border-t-fg-onEmphasis border-canvas-default" />}
      {children}
    </button>
  );
}

export default Button;
