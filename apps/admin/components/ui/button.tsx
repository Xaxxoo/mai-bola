'use client';
import type { ButtonHTMLAttributes } from 'react';
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md'; loading?: boolean }) {
  const styles = { primary: 'bg-forest text-white hover:bg-green-600', secondary: 'border border-green-200 bg-white text-forest hover:bg-tint', ghost: 'text-forest hover:bg-tint' };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return <button disabled={loading || props.disabled} className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${styles[variant]} ${className}`} {...props}>{loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}{children}</button>;
}
