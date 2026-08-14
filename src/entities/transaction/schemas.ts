import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Wire shapes — /api/v1/transactions (apex-rust, banksms rebuild)             */
/*                                                                            */
/* Amounts cross the wire as STRINGS ("9000.0000") and stay strings all the    */
/* way to the screen. There is deliberately no z.coerce.number() here: the     */
/* backend stores NUMERIC(18,4), and routing money through a JS float is how   */
/* cents go missing. Display goes through shared/lib/money.ts.                 */
/* -------------------------------------------------------------------------- */

/** Where a row came from. Fuel and loan rows are synthetic, read-only unions. */
export const TRANSACTION_SOURCES = [
  'whatsapp',
  'import',
  'manual',
  'fuel_event',
  'loan',
  'split',
] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const TRANSACTION_DIRECTIONS = ['in', 'out'] as const;
export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];

/** The linked loans row, when categorising registered one (D2). */
export const loanRefSchema = z.object({
  id: z.number(),
  /** 'advance' | 'loan' | 'salary' */
  kind: z.string(),
  is_paid: z.boolean(),
});

export type LoanRef = z.infer<typeof loanRefSchema>;

export const transactionSchema = z.object({
  id: z.number(),
  source: z.string(),
  raw_message_id: z.number().nullable().optional(),

  direction: z.string(),
  /** Decimal string, e.g. "9000.0000". Never parse into a float for math. */
  amount: z.string(),
  currency: z.string().nullable().optional(),
  occurred_at: z.string(),

  account: z.string().nullable().optional(),
  counterparty: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  car_id: z.number().nullable().optional(),
  car_no_plate: z.string().nullable().optional(),
  driver_id: z.number().nullable().optional(),
  employee_id: z.number().nullable().optional(),
  paid_by: z.string().nullable().optional(),

  loan: loanRefSchema.nullable().optional(),
  /** Present only when the 0.1% IPN fee split derives cleanly; else null. */
  principal: z.string().nullable().optional(),
  fee: z.string().nullable().optional(),

  /**
   * Set on split children (source 'split'): the hidden parent row's id and its
   * amount, so the ledger can say "part of 20,000.00" without another fetch.
   * Split parents never appear in list/statistics responses.
   */
  parent_id: z.number().nullable().optional(),
  parent_amount: z.string().nullable().optional(),

  /** Optimistic-concurrency token. Must go back as `If-Match` on writes. */
  version: z.number(),
  /** False for fuel/loan rows — owned by PetroApp sync and FalconGo. */
  editable: z.boolean(),
  edited_by: z.string().nullable().optional(),
  edited_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),

  /** GET /transactions/{id} only, for whatsapp rows: the verbatim SMS. */
  raw_body: z.string().nullable().optional(),
  raw_wa_timestamp: z.string().nullable().optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionPageSchema = z.object({
  data: z.array(transactionSchema),
  /** Opaque keyset token — "<occurred_at_millis>:<id>". */
  next_cursor: z.string().nullable().optional(),
});

export type TransactionPage = z.infer<typeof transactionPageSchema>;

/* -------------------------------------------------------------------------- */
/* Splits — /api/v1/transactions/{id}/split                                    */
/* -------------------------------------------------------------------------- */

/**
 * The whole split set. GET accepts the parent's id OR any child's id; the
 * parent's `version` is the If-Match token for PUT (replace) and unsplit.
 */
export const splitSetSchema = z.object({
  parent: transactionSchema,
  parts: z.array(transactionSchema),
});

export type SplitSet = z.infer<typeof splitSetSchema>;

/**
 * One part of a POST/PUT split body. Amounts are decimal STRINGS and must sum
 * EXACTLY to the parent amount — the server rejects anything else with a 400.
 * A part categorised into an advance/loan category registers its own loan.
 */
export interface SplitPartInput {
  amount: string;
  category?: string;
  description?: string;
  driver_id?: number;
  employee_id?: number;
  paid_by?: string;
  car_id?: number;
}

/**
 * Can this row be offered the split action at all? Server contract: only
 * unsplit cash-out rows. (A row that registered a loan as a whole is refused
 * server-side with a 409 that says to clear its category first — that message
 * is surfaced verbatim, so the action stays visible for those.)
 */
export function splitEligible(row: Transaction): boolean {
  return (
    row.editable &&
    row.direction === 'out' &&
    row.source !== 'split' &&
    row.parent_id == null &&
    row.source !== 'fuel_event' &&
    row.source !== 'loan'
  );
}

/** Is this row a child of a split set? */
export function isSplitChild(row: Transaction): boolean {
  return row.source === 'split' || row.parent_id != null;
}

/* -------------------------------------------------------------------------- */
/* Statistics — GET /api/v1/transactions/statistics                            */
/* -------------------------------------------------------------------------- */

export const byDateSchema = z.object({
  /** Africa/Cairo calendar day, 'YYYY-MM-DD'. */
  date: z.string(),
  out: z.string(),
  count: z.number(),
});
export type ByDate = z.infer<typeof byDateSchema>;

export const byCategorySchema = z.object({
  /** null = the uncategorized bucket. */
  key: z.string().nullable(),
  label: z.string().nullable().optional(),
  label_ar: z.string().nullable().optional(),
  out: z.string(),
  count: z.number(),
});
export type ByCategory = z.infer<typeof byCategorySchema>;

export const byPartySchema = z.object({
  driver_id: z.number().nullable(),
  employee_id: z.number().nullable(),
  name: z.string(),
  /** 'advance' | 'loan' | 'salary' */
  kind: z.string().nullable().optional(),
  total: z.string(),
  count: z.number(),
});
export type ByParty = z.infer<typeof byPartySchema>;

/** The cash-in review pocket: incoming transfers awaiting a human verdict. */
export const pendingInSchema = z.object({
  count: z.number(),
  total: z.string(),
});
export type PendingIn = z.infer<typeof pendingInSchema>;

/**
 * Analytics are CASH-OUT ONLY by contract: there is no total_in, no net, and
 * by_date carries no inflow column. Incoming transfers surface exclusively
 * through `pending_in`, which exists to be reviewed away, not reported on.
 */
export const statisticsSchema = z.object({
  count: z.number(),
  total_out: z.string(),
  total_fees: z.string(),
  pending_in: pendingInSchema.default({ count: 0, total: '0' }),
  by_date: z.array(byDateSchema).default([]),
  by_category: z.array(byCategorySchema).default([]),
  by_party: z.array(byPartySchema).default([]),
});

export type TransactionStatistics = z.infer<typeof statisticsSchema>;

/* -------------------------------------------------------------------------- */
/* Filters — shared by /transactions, /statistics and /export                  */
/* -------------------------------------------------------------------------- */

export interface TransactionFilters {
  /** RFC3339 instants, computed by the client as CAIRO day boundaries. */
  from?: string;
  to?: string;
  category?: string;
  company?: string;
  payment_method?: string;
  q?: string;
  source?: string;
  /** 'out' for the ledger, 'in' for the cash-in review pocket. */
  direction?: TransactionDirection;
  /** Omitted means included (server default true). */
  include_fuel?: string;
  include_loans?: string;
}

/* -------------------------------------------------------------------------- */
/* Form shape                                                                  */
/* -------------------------------------------------------------------------- */

/** Decimal string with up to 4 fraction digits — what NUMERIC(18,4) holds. */
const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, 'Enter a valid amount, e.g. 1250 or 1250.50')
  .refine((v) => /[1-9]/.test(v), 'Amount must be greater than zero');

/**
 * The amount is a STRING here too — the input is a text field with
 * inputmode="decimal", and the value goes to the API verbatim.
 */
export const transactionFormSchema = z.object({
  amount: decimalString,
  currency: z
    .string()
    .trim()
    .length(3, 'Use a 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'Use uppercase, e.g. EGP')
    .default('EGP'),
  direction: z.enum(TRANSACTION_DIRECTIONS).default('out'),
  /** 'YYYY-MM-DD' + 'HH:mm', combined into a Cairo instant on submit. */
  occurred_date: z.string().min(1, 'Select a date'),
  occurred_time: z.string().optional().default(''),
  category: z.string().optional().default(''),
  account: z.string().max(64).optional().default(''),
  counterparty: z.string().max(500).optional().default(''),
  reference: z.string().max(200).optional().default(''),
  description: z.string().max(500).optional().default(''),
  payment_method: z.string().optional().default(''),
  company: z.string().optional().default(''),
  paid_by: z.string().max(200).optional().default(''),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/** Extra write fields that live outside react-hook-form (ids, not text). */
export interface TransactionWriteExtras {
  car_id?: number | null;
  driver_id?: number | null;
  employee_id?: number | null;
  raw_message_id?: number;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

export const COMPANIES = ['Petrol Arrows', 'TAQA', 'Petromin', 'Watanya'] as const;

export const PAYMENT_METHODS = ['Cash', 'IPN Transfer'] as const;
