import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Raw WhatsApp messages — GET /api/v1/raw, /raw/review, /raw/ignored          */
/*                                                                            */
/* The chat these arrive in is a 1:1 conversation that carries ordinary human  */
/* messages as well as forwarded bank SMS, and roughly 93% of it is chatter.   */
/* The triage gate sorts them, and this is the screen where a human corrects   */
/* the gate when it gets one wrong.                                            */
/* -------------------------------------------------------------------------- */

export const PARSE_STATUSES = [
  'pending',
  'parsed',
  'partial',
  'unmatched',
  'ignored',
  'error',
] as const;

export type ParseStatus = (typeof PARSE_STATUSES)[number];

export const rawMessageSchema = z.object({
  id: z.number(),
  wa_message_id: z.string(),
  sender: z.string().nullable().optional(),
  is_from_me: z.boolean(),
  wa_timestamp: z.string(),
  body: z.string(),
  parse_status: z.string(),
  skeleton_hash: z.string().nullable().optional(),
  /**
   * How many stored messages share this skeleton. The review queue sorts by it
   * descending: a format seen many times with no matching template means a bank
   * changed its SMS wording, which is the expensive case. A one-off is almost
   * always a human message that slipped past triage.
   */
  skeleton_count: z.coerce.number().default(0),
  /** 0–100, how bank-SMS-like the triage gate judged this message. */
  triage_score: z.number().nullable().optional(),
  parser_version: z.number().nullable().optional(),
});

export type RawMessage = z.infer<typeof rawMessageSchema>;
export const rawMessagesSchema = z.array(rawMessageSchema);

/** What a human decided a misclassified message actually is. */
export type ReclassifyAs = 'transaction' | 'noise';

/* -------------------------------------------------------------------------- */
/* Notes — the "complete the message" half of the workflow                     */
/* -------------------------------------------------------------------------- */

export const noteSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  body: z.string(),
  author: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Note = z.infer<typeof noteSchema>;
export const notesSchema = z.array(noteSchema);

/* -------------------------------------------------------------------------- */
/* Tags                                                                        */
/* -------------------------------------------------------------------------- */

export const tagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable().optional(),
});

export type Tag = z.infer<typeof tagSchema>;
export const tagsSchema = z.array(tagSchema);

/* -------------------------------------------------------------------------- */
/* Presentation helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Tailwind classes per status. `ignored` is deliberately muted rather than
 * red — it is the expected outcome for ~93% of this chat, not a failure, and
 * colouring it as an error trains people to ignore real problems.
 */
export const STATUS_TONE: Record<string, string> = {
  parsed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  unmatched: 'bg-red-500/10 text-red-600 dark:text-red-400',
  ignored: 'bg-muted text-muted-foreground',
  pending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
};
