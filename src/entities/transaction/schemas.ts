import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Wire shapes — GET /api/v1/transactions (apex-rust, banksms schema)          */
/*                                                                            */
/* These replace the legacy `fleet_expenses` table entirely. That table is     */
/* never read, written or referenced: its rows were migrated into              */
/* banksms.transactions as `source: 'import'`.                                 */
/* -------------------------------------------------------------------------- */

/** Where a row came from. Replaces the old fleet_expense/fuel_event/loan split. */
export const TRANSACTION_SOURCES = ['whatsapp', 'import', 'manual'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const TRANSACTION_DIRECTIONS = ['in', 'out'] as const;
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];

/**
 * Amounts arrive as JSON strings, not numbers — the backend stores money as
 * NUMERIC(18,4) and serialises `rust_decimal::Decimal` losslessly. Coercing to
 * `number` here is safe for display (EGP amounts are far below 2^53) but the
 * string is what the API round-trips, so writes send it back as a string.
 */
const money = z.coerce.number();

/** The parser's original reading, before any user correction. */
export const parsedViewSchema = z.object({
  direction: z.string().nullable().optional(),
  amount: money.nullable().optional(),
  currency: z.string().nullable().optional(),
  account: z.string().nullable().optional(),
  counterparty: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  balance_after: money.nullable().optional(),
  occurred_at: z.string().nullable().optional(),
  template: z.string().nullable().optional(),
  parser_version: z.number().nullable().optional(),
});

export const transactionSchema = z.object({
  id: z.number(),
  /** Optimistic-concurrency token. Must be sent back as `If-Match` on writes. */
  version: z.number(),
  source: z.string(),
  raw_message_id: z.number().nullable().optional(),

  /* Effective values — COALESCE(override, parsed_*) — what the user should see */
  direction: z.string().nullable().optional(),
  amount: money.nullable().optional(),
  currency: z.string().nullable().optional(),
  account: z.string().nullable().optional(),
  counterparty: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  occurred_at: z.string().nullable().optional(),

  confidence: z.number(),
  parse_method: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  verified: z.boolean(),

  description: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  car_no_plate: z.string().nullable().optional(),
  paid_by: z.string().nullable().optional(),

  /** Derived server-side from the 0.1% IPN fee — never a stored column. */
  principal: money.nullable().optional(),
  fee: money.nullable().optional(),

  /** True when a user has corrected at least one parsed field. */
  has_overrides: z.boolean().optional().default(false),
  parsed: parsedViewSchema.optional().default({}),

  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionPageSchema = z.object({
  data: z.array(transactionSchema),
  next_cursor: z.number().nullable().optional(),
});

export type TransactionPage = z.infer<typeof transactionPageSchema>;

/* -------------------------------------------------------------------------- */
/* Statistics — GET /api/v1/transactions/statistics                            */
/* -------------------------------------------------------------------------- */

export const breakdownSchema = z.object({
  key: z.string(),
  count: z.number(),
  total_amount: money,
});

export type Breakdown = z.infer<typeof breakdownSchema>;

export const statisticsSchema = z.object({
  total_amount: money,
  total_in: money,
  total_out: money,
  net: money,
  total_fees: money,
  expense_count: z.number(),
  by_date: z.array(breakdownSchema).default([]),
  by_type: z.array(breakdownSchema).default([]),
  by_car: z.array(breakdownSchema).default([]),
  by_company: z.array(breakdownSchema).default([]),
  by_source: z.array(breakdownSchema).default([]),
  by_payment_method: z.array(breakdownSchema).default([]),
  by_account: z.array(breakdownSchema).default([]),
});

export type TransactionStatistics = z.infer<typeof statisticsSchema>;

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

export interface TransactionFilters {
  from?: string;
  to?: string;
  category?: string;
  company?: string;
  car_no_plate?: string;
  payment_method?: string;
  source?: string;
  account?: string;
  direction?: string;
  min_amount?: string;
  max_amount?: string;
  verified?: boolean;
  q?: string;
}

/* -------------------------------------------------------------------------- */
/* Form shapes                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors the server's validation so the user gets errors before a round-trip.
 * Kept deliberately in step with `validate()` in apex-rust's
 * src/api/transactions.rs — if one changes, change both.
 */
export const expenseFormSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Enter a valid amount' })
    .positive('Amount must be greater than zero'),
  currency: z
    .string()
    .length(3, 'Use a 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'Use uppercase, e.g. EGP')
    .default('EGP'),
  direction: z.enum(TRANSACTION_DIRECTIONS).default('out'),
  occurred_at: z.string().min(1, 'Select a date'),
  category: z.string().optional().default(''),
  description: z.string().max(500).optional().default(''),
  payment_method: z.string().optional().default(''),
  company: z.string().optional().default(''),
  car_no_plate: z.string().optional().default(''),
  paid_by: z.string().optional().default(''),
  counterparty: z.string().max(500).optional().default(''),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/* -------------------------------------------------------------------------- */
/* Constants — carried over verbatim from the legacy module                    */
/* -------------------------------------------------------------------------- */

/** The eight values actually present in the migrated data, plus legacy extras. */
export const EXPENSE_TYPES = [
  'Fuel',
  'Maintenance',
  'Repairs',
  'Insurance',
  'Registration',
  'Tolls',
  'Parking',
  'Fines',
  'Cleaning',
  'Tires',
  'Parts',
  'Labor',
  'Loan',
  'Other',
] as const;

export const COMPANIES = ['Petrol Arrows', 'TAQA', 'Petromin', 'Watanya'] as const;

/** Constrained by a CHECK constraint on the legacy table; kept identical. */
export const PAYMENT_METHODS = ['Cash', 'IPN Transfer'] as const;

/** Bucket key the API uses for rows with no value in a dimension. */
export const NONE_KEY = '(none)';
