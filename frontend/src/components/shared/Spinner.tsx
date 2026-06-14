interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`rounded-full border-t-brand-500 border-surface-800 animate-spin ${sizeClasses[size]} ${className}`}
      style={{ borderStyle: 'solid', borderLeftColor: 'transparent', borderRightColor: 'transparent' }}
    />
  );
}

export default Spinner;
