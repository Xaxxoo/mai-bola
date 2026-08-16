export const Role = {
  SUPPLIER: 'SUPPLIER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
