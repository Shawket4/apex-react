import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* AI fleet advisor — apex-rust `/api/v1/advisor`                              */
/*                                                                             */
/* Statuses gate the Approve/Reject buttons, so they are a strict enum: a      */
/* status this build does not know must not fall back to one that shows        */
/* buttons. Kinds and tool names are open sets — the UI labels the known ones  */
/* and echoes the rest verbatim.                                               */
/* -------------------------------------------------------------------------- */

export const SUGGESTION_STATUSES = ['pending', 'applying', 'applied', 'failed', 'rejected'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const KNOWN_SUGGESTION_KINDS = ['reassign_car', 'assign_driver'] as const;

export const KNOWN_ADVISOR_TOOLS = [
  'find_truck',
  'fleet_overview',
  'revenue_breakdown',
  'truck_itinerary',
  'trip_audit',
  'route_options',
  'search_service_history',
  'maintenance_status',
  'run_sql',
  'propose_change',
] as const;

const id = z.union([z.number(), z.string()]);
const nullableString = z
  .string()
  .nullish()
  .transform((v) => v ?? null);
const objectOrEmpty = z
  .record(z.unknown())
  .nullish()
  .transform((v) => v ?? {});

export const advisorStatusSchema = z.object({
  enabled: z.boolean(),
  model: nullableString,
});
export type AdvisorStatus = z.infer<typeof advisorStatusSchema>;

export const suggestionSchema = z.object({
  id: z.string(),
  conversation_id: nullableString,
  kind: z.string(),
  title: z.string(),
  rationale: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  before: objectOrEmpty,
  after: objectOrEmpty,
  target: nullableString,
  method: nullableString,
  path: nullableString,
  body: z.unknown().optional(),
  status: z.enum(SUGGESTION_STATUSES),
  proposed_for_user_id: id.nullish(),
  decided_by_user_id: id.nullish(),
  decided_at: nullableString,
  applied_at: nullableString,
  result_status: z.number().nullish(),
  result: z.unknown().optional(),
  created_at: nullableString,
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  created_at: nullableString,
  updated_at: nullableString,
});
export type Conversation = z.infer<typeof conversationSchema>;

export const advisorMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  tools: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
});
export type AdvisorMessage = z.infer<typeof advisorMessageSchema>;

export const conversationDetailSchema = z.object({
  id: z.string(),
  messages: z.array(advisorMessageSchema),
  suggestions: z
    .array(suggestionSchema)
    .nullish()
    .transform((v) => v ?? []),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

/* -------------------------------------------------------------------------- */
/* Stream events (POST /chat, text/event-stream)                               */
/* -------------------------------------------------------------------------- */

export const toolRunSchema = z.object({
  name: z.string(),
  ms: z.number().nullish(),
  ok: z.boolean().nullish(),
});
export type ToolRun = z.infer<typeof toolRunSchema>;

export const conversationEventSchema = z.object({ conversation_id: z.string() });
export const toolEventSchema = z.object({ name: z.string(), args: z.unknown().optional() });
export const answerEventSchema = z.object({
  conversation_id: z.string(),
  answer: z.string(),
  suggestions: z
    .array(suggestionSchema)
    .nullish()
    .transform((v) => v ?? []),
  tools: z
    .array(toolRunSchema)
    .nullish()
    .transform((v) => v ?? []),
});
export const errorEventSchema = z.object({ message: z.string() });

export type AdvisorStreamEvent =
  | { type: 'conversation'; data: z.infer<typeof conversationEventSchema> }
  | { type: 'tool'; data: z.infer<typeof toolEventSchema> }
  | { type: 'answer'; data: z.infer<typeof answerEventSchema> }
  | { type: 'error'; data: z.infer<typeof errorEventSchema> };

/* -------------------------------------------------------------------------- */
/* Search (POST /search, permission 1+)                                        */
/* -------------------------------------------------------------------------- */

export const advisorSearchHitSchema = z.object({
  item_id: id.nullish(),
  invoice_id: z.number(),
  car_id: z.number().nullish(),
  plate_number: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  date: nullableString,
  meter_reading: z.number().nullish(),
  service: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  notes: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  score: z.number().nullish(),
  matched: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
});
export type AdvisorSearchHit = z.infer<typeof advisorSearchHitSchema>;

export const advisorSearchResponseSchema = z.object({
  query: z.string(),
  variants: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  plate_number: nullableString,
  count: z.number(),
  hits: z.array(advisorSearchHitSchema),
});
export type AdvisorSearchResponse = z.infer<typeof advisorSearchResponseSchema>;

export interface AdvisorSearchRequest {
  query: string;
  car_id?: number;
  plate_number?: string;
  /** 'YYYY-MM-DD' */
  since?: string;
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/* Digests                                                                     */
/* -------------------------------------------------------------------------- */

export const digestSchema = z.object({
  id,
  period_start: z.string(),
  period_end: z.string(),
  body: z.string(),
  model: nullableString,
  created_at: nullableString,
});
export type Digest = z.infer<typeof digestSchema>;
