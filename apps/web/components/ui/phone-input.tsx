'use client';

import { forwardRef, useState, type ChangeEvent } from 'react';
import { formatPhoneDisplay } from '@/lib/format-phone';

type PhoneInputProps = {
  label?: string;
  error?: string;
  value: string;
  onChange: (raw: string) => void;
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, value, onChange }, ref) => {
    const [display, setDisplay] = useState(() => formatPhoneDisplay(value));

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const input = e.target.value;
      // Only keep digits and spaces
      const digitsOnly = input.replace(/[^\d]/g, '');
      const formatted = formatPhoneDisplay(digitsOnly);
      setDisplay(formatted);
      onChange(digitsOnly);
    }

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-text">{label}</label>
        )}
        <div
          className={`flex items-center rounded-xl border bg-white transition-colors ${
            error ? 'border-red-400' : 'border-gray-200 focus-within:border-green-500'
          }`}
        >
          <span className="pl-4 text-sm text-muted select-none">+234</span>
          <input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            placeholder="XXX XXX XXXX"
            className="w-full bg-transparent px-2 py-2.5 text-sm text-text placeholder:text-muted outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';
