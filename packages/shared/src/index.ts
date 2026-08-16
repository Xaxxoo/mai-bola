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
export {
  APP_NAME,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  KADUNA_ZONES,
} from './constants';
export type { KadunaZone } from './constants';
