// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// Roles
export const Role = {
  SUPPLIER: 'SUPPLIER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// Constants
export const APP_NAME = 'Mai Bola';
export const DEFAULT_PAGE_SIZE = 20;
