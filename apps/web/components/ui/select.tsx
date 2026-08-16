'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full appearance-none rounded-xl border bg-white px-4 py-2.5 text-sm text-text transition-colors ${
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-200 focus:border-green-500'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
