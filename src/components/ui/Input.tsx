import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, type = 'text', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={`block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
            error ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
