export const APP_NAME = 'Mai Bola';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const KADUNA_ZONES = [
  'Barnawa',
  'Kaduna North',
  'Kaduna South',
  'Tudun Wada',
  'Kakuri',
  'Malali',
  'Ungwan Rimi',
  'Rigasa',
  'Narayi',
  'Sabon Tasha',
] as const;

export type KadunaZone = (typeof KADUNA_ZONES)[number];
