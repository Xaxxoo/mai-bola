type SkeletonProps = {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
};

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const base = 'animate-pulse bg-gray-200';
  const shape = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  }[variant];

  return (
    <div
      className={`${base} ${shape} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-2/3" />
    </div>
  );
}
