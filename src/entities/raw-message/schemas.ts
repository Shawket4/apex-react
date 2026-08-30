import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Messages — GET /api/v1/messages                                             */
/*                                                                            */
/* Every WhatsApp message the poller stored, with the parser's verdict. These  */
/* are VERDICTS, not work items: `matched` minted a transaction, `suppressed`  */
/* was excluded on purpose (PetroApp double-count guard), `ignored` matched    */
/* no template — which for this chat is the expected outcome, ~93% of it is    */
/* ordinary conversation. A wrongly-ignored bank SMS is fixed by promoting it  */
/* into a transaction, once; nothing re-queues.                                */
/* -------------------------------------------------------------------------- */

export const MESSAGE_STATUSES = ['ignored', 'suppressed', 'matched'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const messageSchema = z.object({
  id: z.number(),
  wa_message_id: z.string(),
  wa_timestamp: z.string(),
  body: z.string(),
  media_type: z.string().nullable().optional(),
  is_from_me: z.boolean(),
  status: z.string(),
  /** The template that matched (or suppressed) — null for plain ignores. */
  template: z.string().nullable().optional(),
  /** Set when a transaction exists for this message (matched or promoted). */
  transaction_id: z.number().nullable().optional(),
});

export type Message = z.infer<typeof messageSchema>;

export const messagePageSchema = z.object({
  data: z.array(messageSchema),
  /** Opaque keyset token — "<wa_timestamp_millis>:<id>". */
  next_cursor: z.string().nullable().optional(),
});

export type MessagePage = z.infer<typeof messagePageSchema>;

export interface MessageFilters {
  status?: MessageStatus;
  q?: string;
  /** Default false server-side: empty-body media rows stay hidden. */
  include_media?: string;
}

/* -------------------------------------------------------------------------- */
/* Presentation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Tailwind classes per status. `ignored` is deliberately muted rather than
 * red — it is the expected outcome for most of this chat, not a failure, and
 * colouring it as an error trains people to ignore real problems.
 */
export const STATUS_TONE: Record<string, string> = {
  ignored: 'bg-muted text-muted-foreground',
  suppressed: 'bg-warning/10 text-warning',
  matched: 'bg-success/10 text-success',
};
