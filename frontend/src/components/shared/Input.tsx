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
          <label className="text-sm font-black text-[#111827] uppercase tracking-widest mb-1.5 font-sans">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full px-4 py-2.5 bg-white border-2 border-[#111827] text-[#111827] placeholder-gray-500 outline-none transition-all duration-100 focus:border-[3px] focus:border-[#DD614C] ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-error font-extrabold mt-1 animate-fade-in font-sans">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
