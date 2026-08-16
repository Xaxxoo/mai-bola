import { PickupRequestStatus, PayoutStatus } from '@mai-bola/shared';

const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
} as const;

type BadgeProps = {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
};

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

const pickupStatusVariant: Record<string, keyof typeof variants> = {
  [PickupRequestStatus.PENDING]: 'warning',
  [PickupRequestStatus.ASSIGNED]: 'info',
  [PickupRequestStatus.EN_ROUTE]: 'info',
  [PickupRequestStatus.COLLECTED]: 'success',
  [PickupRequestStatus.CANCELLED]: 'error',
};

const payoutStatusVariant: Record<string, keyof typeof variants> = {
  [PayoutStatus.PENDING]: 'warning',
  [PayoutStatus.PROCESSING]: 'info',
  [PayoutStatus.COMPLETED]: 'success',
  [PayoutStatus.FAILED]: 'error',
};

type StatusBadgeProps = {
  type: 'pickup' | 'payout';
  status: string;
  className?: string;
};

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const map = type === 'pickup' ? pickupStatusVariant : payoutStatusVariant;
  const variant = map[status] || 'default';
  const label = status.replace(/_/g, ' ');

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
