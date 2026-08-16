export const Role = {
  SUPPLIER: 'SUPPLIER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const PickupRequestStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  EN_ROUTE: 'EN_ROUTE',
  COLLECTED: 'COLLECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type PickupRequestStatus =
  (typeof PickupRequestStatus)[keyof typeof PickupRequestStatus];

export const PayoutStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const SupplierType = {
  HOUSEHOLD: 'HOUSEHOLD',
  WASTE_PICKER: 'WASTE_PICKER',
  BUSINESS: 'BUSINESS',
} as const;

export type SupplierType = (typeof SupplierType)[keyof typeof SupplierType];
