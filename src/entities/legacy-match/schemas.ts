import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Old service-invoice lines the garage system could not put a name to         */
/*                                                                            */
/* maint-rust reads the old invoices and matches each line to a maintenance    */
/* type, so the due clock counts work done before work orders existed. A       */
/* wording nobody recognised waits here for a person. Another service's data,  */
/* so the schemas are lenient: a missing field is a dash, not a failed page.   */
/* -------------------------------------------------------------------------- */

const text = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

const count = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  });

export const unmatchedRowSchema = z
  .object({
    /** The wording as the server compares it: the key of a decision. */
    norm_text: z.string(),
    /** The wording as someone typed it on an invoice. */
    text,
    lines: count,
    vehicles: count,
    last_at: text,
  })
  .passthrough();
export type UnmatchedRow = z.infer<typeof unmatchedRowSchema>;

const statsSchema = z
  .object({ lines: count, recognised: count, ignored: count })
  .passthrough();
export type LegacyStats = z.infer<typeof statsSchema>;

export const unmatchedPageSchema = z
  .object({
    rows: z
      .array(unmatchedRowSchema)
      .nullish()
      .transform((value) => value ?? []),
    stats: statsSchema.nullish().transform(
      (value): LegacyStats => value ?? { lines: 0, recognised: 0, ignored: 0 },
    ),
  })
  .passthrough();
export type UnmatchedPage = z.infer<typeof unmatchedPageSchema>;

export const importResultSchema = z
  .object({ lines: count, recognised: count, unrecognised: count, removed: count })
  .passthrough();
export type ImportResult = z.infer<typeof importResultSchema>;

export const maintCategorySchema = z
  .object({
    id: z.string(),
    name_ar: text,
    name_en: text,
    sort_order: z.number().nullable().optional(),
  })
  .passthrough();
export type MaintCategory = z.infer<typeof maintCategorySchema>;

export const maintCategoriesSchema = z
  .array(maintCategorySchema)
  .nullish()
  .transform((value) => value ?? []);

/** What a person says about one wording. null: not periodic maintenance. */
export interface LegacyDecision {
  norm_text: string;
  category_id: string | null;
}
