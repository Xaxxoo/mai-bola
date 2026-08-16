'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helper?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-text placeholder:text-muted transition-colors ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-200 focus:border-green-500'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {!error && helper && <p className="text-xs text-muted">{helper}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
