/**
 * Permission levels — MUST match backend contract.
 * Stored as a numeric string in localStorage under `permission`.
 */
export const PERMISSION_LEVELS = {
  VIEWER: 1,
  EDITOR: 2,
  MANAGER: 3,
  ADMIN: 4,
} as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[keyof typeof PERMISSION_LEVELS];

export const STORAGE_KEYS = {
  JWT: 'jwt',
  PERMISSION: 'permission',
  USER_NAME: 'user_name',
  USER_EMAIL: 'user_email',
  LANGUAGE: 'i18nextLng',
  THEME: 'apex-theme',
} as const;

export const QUERY_KEYS = {
  auth: ['auth'] as const,
  cars: ['cars'] as const,
  drivers: ['drivers'] as const,
  driver: (id: number | string) => ['drivers', String(id)] as const,
  driverExpenses: (id: number | string) => ['drivers', String(id), 'expenses'] as const,
  driverLoans: (id: number | string) => ['drivers', String(id), 'loans'] as const,
  driverSalaries: (id: number | string) => ['drivers', String(id), 'salaries'] as const,
  loanStats: ['loan-stats'] as const,
  fuelEvents: ['fuel-events'] as const,
  fuelEvent: (id: number | string) => ['fuel-events', String(id)] as const,
} as const;

export const FUEL_EFFICIENCY = {
  /** Below this km/L the event is considered invalid and excluded from averages */
  MIN_VALID: 1.0,
  /** Above this km/L the event is considered invalid and excluded from averages */
  MAX_VALID: 3.2,
  POOR_THRESHOLD: 1.8,
  AVERAGE_THRESHOLD: 1.9,
} as const;

export const DEFAULT_CURRENCY = 'EGP';

export const DEFAULT_PRICE_PER_LITER = '20.6';
