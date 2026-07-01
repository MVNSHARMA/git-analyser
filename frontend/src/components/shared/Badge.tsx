import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const styles = {
    success: 'border-success-fg text-success-fg bg-canvas-default',
    warning: 'border-attention-fg text-attention-fg bg-canvas-default',
    error:   'border-danger-fg text-danger-fg bg-canvas-default',
    info:    'border-accent-emphasis text-accent-emphasis bg-canvas-default',
    default: 'border-default text-fg-default bg-canvas-default',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium select-none border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
