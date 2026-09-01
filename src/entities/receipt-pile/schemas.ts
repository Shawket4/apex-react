import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Receipt piles — the filing plan for a range of Watanya receipts             */
/*                                                                            */
/* Watanya-only by design: the backend hard-codes the company, and the        */
/* grouping key is the first Arabic letter of the drop-off name with the      */
/* definite article stripped (العياط files under ع). Nothing here is          */
/* parameterised by company, and it should not be — no other customer's       */
/* paper comes back as one heap to be filed this way.                         */
/*                                                                            */
/* The server owns the whole plan. This layer parses it and nothing more:     */
/* a second implementation of the balancing in TypeScript is a second answer  */
/* to drift from, and the export must match the screen exactly.               */
/* -------------------------------------------------------------------------- */

/** How the letters are cut into piles. */
export const PILE_MODES = ['balanced', 'letter'] as const;
export type PileMode = (typeof PILE_MODES)[number];

const receiptSchema = z.object({
  receipt_no: z.string(),
  drop_off_point: z.string(),
  terminal: z.string(),
  date: z.string(),
  car_no_plate: z.string(),
  driver_name: z.string(),
  /** Position within this drop-off, 1-based: "3 of 11". */
  seq: z.number(),
  out_of: z.number(),
  pile: z.number(),
});

const dropOffSchema = z.object({
  name: z.string(),
  letter: z.string(),
  receipt_count: z.number(),
  terminals: z.array(z.string()).nullish().transform((v) => v ?? []),
  receipts: z.array(receiptSchema).nullish().transform((v) => v ?? []),
});

const letterSchema = z.object({
  letter: z.string(),
  receipt_count: z.number(),
  drop_offs: z.array(dropOffSchema).nullish().transform((v) => v ?? []),
});

const pileSchema = z.object({
  index: z.number(),
  label: z.string(),
  letters: z.array(letterSchema).nullish().transform((v) => v ?? []),
  drop_off_count: z.number(),
  receipt_count: z.number(),
});

export const pilePlanSchema = z.object({
  mode: z.enum(PILE_MODES),
  start_date: z.string(),
  end_date: z.string(),
  piles: z.array(pileSchema).nullish().transform((v) => v ?? []),
  total_receipts: z.number(),
  total_drop_offs: z.number(),
  total_letters: z.number(),
  heaviest_pile: z.number(),
  lightest_pile: z.number(),
  /**
   * The heaviest single letter. No pile can be lighter than this, because a
   * letter is never split across boxes — so it is the floor under
   * `heaviest_pile`, and the honest answer when the boxes look uneven.
   */
  floor_letter: z.string(),
  floor_weight: z.number(),
  /** True when the server derived the pile count instead of being told one. */
  auto_pile_count: z.boolean(),
  /** Trips in range with no receipt number — reported, not silently dropped. */
  skipped_receipts: z.number(),
});

export type PilePlan = z.infer<typeof pilePlanSchema>;
export type Pile = PilePlan['piles'][number];
export type PileDropOff = Pile['letters'][number]['drop_offs'][number];

export interface PilePlanParams {
  startDate: string;
  endDate: string;
  mode: PileMode;
  /** Omit to let the server choose a count from the range. */
  piles?: number;
}
