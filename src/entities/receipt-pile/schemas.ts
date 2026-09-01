import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Receipt piles — the filing plan for a range of returned Watanya paper       */
/*                                                                            */
/* Watanya-only by construction: the backend hard-codes the company and the    */
/* grouping key is the first Arabic letter of the drop-off name with the       */
/* definite article stripped (العياط files under ع, not ا). Nothing here is    */
/* parameterised by company and nothing should be — the letter rules are       */
/* Arabic-specific, and no other customer's receipts come back as one heap.    */
/*                                                                            */
/* The server owns the whole plan; this layer parses it and stops there. A     */
/* second implementation of the balancing in TypeScript would be a second      */
/* answer to drift from, and the workbook has to be the plan on screen.        */
/* -------------------------------------------------------------------------- */

/** How the letter sequence is cut into boxes. */
export const PILE_MODES = ['balanced', 'letter'] as const;
export type PileMode = (typeof PILE_MODES)[number];

/** Matches services.MaxPiles in FalconGo — past this, boxes come back empty. */
export const MAX_PILES = 31;

/** Arrays are `null` rather than `[]` on an empty Go slice — normalise on read. */
const list = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).nullish().transform((v) => v ?? []);

const receiptSchema = z.object({
  receipt_no: z.string(),
  drop_off_point: z.string(),
  terminal: z.string(),
  date: z.string(),
  car_no_plate: z.string(),
  driver_name: z.string(),
  /** Position within this drop-off, 1-based: the "3 / 11" on the checklist. */
  seq: z.number(),
  out_of: z.number(),
  pile: z.number(),
});

const dropOffSchema = z.object({
  name: z.string(),
  letter: z.string(),
  receipt_count: z.number(),
  terminals: list(z.string()),
  receipts: list(receiptSchema),
});

const letterSchema = z.object({
  letter: z.string(),
  receipt_count: z.number(),
  drop_offs: list(dropOffSchema),
});

const pileSchema = z.object({
  index: z.number(),
  label: z.string(),
  letters: list(letterSchema),
  drop_off_count: z.number(),
  receipt_count: z.number(),
});

export const pilePlanSchema = z.object({
  mode: z.enum(PILE_MODES),
  start_date: z.string(),
  end_date: z.string(),
  piles: list(pileSchema),
  total_receipts: z.number(),
  total_drop_offs: z.number(),
  total_letters: z.number(),
  heaviest_pile: z.number(),
  lightest_pile: z.number(),
  /**
   * The heaviest single letter, and which one. A letter is never split across
   * boxes, so no box can be lighter than this — it is the floor under
   * `heaviest_pile` and the honest answer when the boxes look uneven.
   */
  floor_letter: z.string(),
  floor_weight: z.number(),
  /** True when the server chose the box count instead of being told one. */
  auto_pile_count: z.boolean(),
  /** Trips in range with no receipt number: reported, never silently dropped. */
  skipped_receipts: z.number(),
});

export type PilePlan = z.infer<typeof pilePlanSchema>;
export type Pile = PilePlan['piles'][number];
export type PileLetter = Pile['letters'][number];
export type PileDropOff = PileLetter['drop_offs'][number];

/**
 * What both endpoints take. `startDate`/`endDate` are Cairo calendar days
 * (YYYY-MM-DD) — the shape `useScope().range` already hands out, which is why
 * this page has no date picker of its own.
 */
export interface PilePlanParams {
  startDate: string;
  endDate: string;
  mode: PileMode;
  /** Omit to let the server derive a count from the range. */
  piles?: number;
}

/**
 * One box's drop-offs, flattened for rendering: the letter is carried on the
 * row and marked as repeated so the list can show it once per run.
 */
export function flattenPile(pile: Pile): Array<PileDropOff & { firstOfLetter: boolean }> {
  return pile.letters.flatMap((letter) =>
    letter.drop_offs.map((drop, i) => ({ ...drop, firstOfLetter: i === 0 })),
  );
}

/* -------------------------------------------------------------------------- */
/* One drop-off, as the Watanya fee report lays it out                         */
/*                                                                            */
/* Fetched separately when a drop-off is opened: the plan already carries      */
/* every receipt in the range, and inlining a priced per-terminal breakdown    */
/* for a hundred drop-offs would multiply that payload for a view of one.      */
/*                                                                            */
/* The order is the server's and must not be touched here. Terminals come      */
/* back in the report's byte-order sort and the receipts inside each by date   */
/* then receipt number, so any re-sorting in the UI would break the one thing  */
/* this view exists to guarantee.                                              */
/* -------------------------------------------------------------------------- */

const dropOffReceiptSchema = z.object({
  seq: z.number(),
  date: z.string(),
  receipt_no: z.string(),
  driver_name: z.string(),
  car_no_plate: z.string(),
  tank_capacity: z.number(),
  mileage: z.number(),
  actual_fee: z.number(),
  cost: z.number(),
});

const dropOffTerminalSchema = z.object({
  terminal: z.string(),
  distance: z.number(),
  fee_index: z.number(),
  actual_fee: z.number(),
  /**
   * The terminal-drop-off pair has no fee mapping, so the fee report omits
   * this table entirely. The paper still exists, so it is shown and flagged.
   */
  unmapped: z.boolean(),
  receipts: list(dropOffReceiptSchema),
  receipt_count: z.number(),
  total_capacity: z.number(),
  total_cost: z.number(),
});

export const dropOffDetailSchema = z.object({
  drop_off_point: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  terminals: list(dropOffTerminalSchema),
  receipt_count: z.number(),
  total_capacity: z.number(),
  total_cost: z.number(),
  unmapped_receipts: z.number(),
});

export type DropOffDetail = z.infer<typeof dropOffDetailSchema>;
export type DropOffTerminal = DropOffDetail['terminals'][number];
export type DropOffReceipt = DropOffTerminal['receipts'][number];

export interface DropOffDetailParams {
  startDate: string;
  endDate: string;
  dropOffPoint: string;
}
