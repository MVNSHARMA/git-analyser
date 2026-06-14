import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const styles = {
    success: 'border-[#16A34A] text-[#16A34A] bg-white',
    warning: 'border-[#D97706] text-[#D97706] bg-white',
    error:   'border-[#DC2626] text-[#DC2626] bg-white',
    info:    'border-[#DD614C] text-[#DD614C] bg-white',
    default: 'border-[#111827] text-[#111827] bg-white',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-black tracking-wider uppercase select-none border-2 ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
