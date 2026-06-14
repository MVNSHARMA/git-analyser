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
    'inline-flex items-center justify-center font-black uppercase tracking-wider transition-all duration-100 outline-none select-none brutal-hover border-[3px] border-[#111827] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none';

  const variants = {
    primary: 'bg-[#DD614C] text-white hover:bg-[#c24c38]',
    secondary: 'bg-white text-[#111827] hover:bg-surface-100',
    ghost: 'bg-transparent text-[#111827] hover:bg-surface-100 border-opacity-40 hover:border-opacity-100',
    danger: 'bg-[#DC2626] text-white hover:bg-red-700',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs font-bold',
    md: 'px-6 py-2.5 text-sm font-extrabold',
    lg: 'px-8 py-3.5 text-base font-black',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2 border-t-[#111827] border-r-transparent border-l-transparent" />}
      {children}
    </button>
  );
}

export default Button;
