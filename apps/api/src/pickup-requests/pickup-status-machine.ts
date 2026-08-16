import { BadRequestException } from '@nestjs/common';
import { PickupRequestStatus } from '../enums';

const TRANSITIONS: Record<PickupRequestStatus, PickupRequestStatus[]> = {
  [PickupRequestStatus.PENDING]: [
    PickupRequestStatus.CLUSTERED,
    PickupRequestStatus.CANCELLED,
  ],
  [PickupRequestStatus.CLUSTERED]: [
    PickupRequestStatus.SCHEDULED,
    PickupRequestStatus.CANCELLED,
  ],
  [PickupRequestStatus.SCHEDULED]: [PickupRequestStatus.EN_ROUTE],
  [PickupRequestStatus.EN_ROUTE]: [
    PickupRequestStatus.COLLECTED,
    PickupRequestStatus.PENDING,
  ],
  [PickupRequestStatus.COLLECTED]: [],
  [PickupRequestStatus.CANCELLED]: [],
};

const OPEN_STATUSES: PickupRequestStatus[] = [
  PickupRequestStatus.PENDING,
  PickupRequestStatus.CLUSTERED,
  PickupRequestStatus.SCHEDULED,
];

export function assertTransition(
  from: PickupRequestStatus,
  to: PickupRequestStatus,
): void {
  const allowed = TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition from ${from} to ${to}`,
    );
  }
}

export function isOpenStatus(status: PickupRequestStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export { TRANSITIONS, OPEN_STATUSES };
