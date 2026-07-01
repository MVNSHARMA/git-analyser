import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col mb-4">
        {label && (
          <label className="text-sm font-medium text-fg-default mb-1.5 font-sans">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full px-4 py-2.5 bg-canvas-default border border-default rounded-md text-fg-default placeholder-fg-subtle outline-none transition-colors duration-100 focus:border-accent-emphasis focus:ring-1 focus:ring-accent-emphasis ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-danger-fg font-medium mt-1 animate-fade-in font-sans">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
