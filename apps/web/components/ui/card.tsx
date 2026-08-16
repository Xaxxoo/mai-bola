import type { HTMLAttributes } from 'react';

const paddings = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: keyof typeof paddings;
};

export function Card({
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-sm ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
