import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/** Radius visualized when a terminal has no stored override. */
export const TERMINAL_DEFAULT_RADIUS_M = 500;
/** Radius visualized when a drop-off point has no stored override. */
export const DROPOFF_DEFAULT_RADIUS_M = 300;

/* -------------------------------------------------------------------------- */
/* FalconGo shapes (Go/GORM naming: `ID`, `long`)                              */
/*                                                                             */
/* Terminals moved from free-text strings (with aliases) to picked-by-id       */
/* entities with per-company allowlists and per-(terminal,company) receipt     */
/* serial patterns. The backend is inconsistent about `ID` vs `id` and is      */
/* mid-migration from `lat`/`long` to `latitude`/`longitude`, so the raw       */
/* schemas accept both and normalise here.                                     */
/* -------------------------------------------------------------------------- */

const receiptPatternRawSchema = z
  .object({
    ID: z.number().nullish(),
    id: z.number().nullish(),
    terminal_id: z.number().nullish(),
    company: z.string().nullish(),
    pattern: z.string(),
    description: z.string().nullish(),
    active: z.boolean().nullish(),
  })
  .passthrough();

export const receiptPatternSchema = receiptPatternRawSchema.transform((row) => ({
  ID: row.ID ?? row.id ?? 0,
  terminal_id: row.terminal_id ?? null,
  /** null / empty string means "applies to all companies". */
  company: row.company?.trim() ? row.company : null,
  pattern: row.pattern,
  description: row.description ?? '',
  active: row.active ?? false,
}));

export type ReceiptPattern = z.output<typeof receiptPatternSchema>;

const terminalRawSchema = z
  .object({
    ID: z.number().nullish(),
    id: z.number().nullish(),
    name: z.string(),
    address: z.string().nullish(),
    lat: z.number().nullish(),
    long: z.number().nullish(),
    latitude: z.number().nullish(),
    longitude: z.number().nullish(),
    radius_m: z.number().nullish(),
    allowed_companies: z.array(z.string()).nullish(),
    receipt_pattern: receiptPatternRawSchema.nullish(),
  })
  .passthrough();

export const terminalSchema = terminalRawSchema.transform((row) => ({
  ID: row.ID ?? row.id ?? 0,
  name: row.name,
  address: row.address ?? null,
  lat: row.lat ?? row.latitude ?? null,
  long: row.long ?? row.longitude ?? null,
  radius_m: row.radius_m ?? null,
  /** Only populated when listing without a company filter. */
  allowed_companies: row.allowed_companies ?? [],
  /** Company-resolved pattern — populated on `GET /api/terminals?company=X`. */
  receipt_pattern:
    row.receipt_pattern != null ? receiptPatternSchema.parse(row.receipt_pattern) : null,
}));

export type Terminal = z.output<typeof terminalSchema>;

/** `POST /api/terminals` — resolve-or-create-or-extend response. */
export const resolveTerminalResponseSchema = z
  .object({
    terminal: terminalSchema,
    created: z.boolean().nullish(),
    extended: z.boolean().nullish(),
  })
  .transform((row) => ({
    terminal: row.terminal,
    created: row.created ?? false,
    extended: row.extended ?? false,
  }));

export type ResolveTerminalResponse = z.output<typeof resolveTerminalResponseSchema>;

export const dropOffPointSchema = z.object({
  ID: z.number(),
  name: z.string(),
  lat: z.number().nullish(),
  long: z.number().nullish(),
  radius_m: z.number().nullish(),
  pin_source: z.string().nullish(),
});

export type DropOffPoint = z.infer<typeof dropOffPointSchema>;

export const locationsInboxSchema = z.object({
  unpinned_dropoffs: z
    .array(dropOffPointSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export type LocationsInbox = z.infer<typeof locationsInboxSchema>;

/* -------------------------------------------------------------------------- */
/* Etit-proxy shapes (GPS-derived pin suggestions)                             */
/* -------------------------------------------------------------------------- */

export const pinSuggestionSchema = z.object({
  id: z.number(),
  kind: z.enum(['terminal', 'dropoff']),
  name: z.string(),
  suggested_lat: z.number(),
  suggested_lng: z.number(),
  current_lat: z.number().nullish(),
  current_lng: z.number().nullish(),
  offset_m: z.number().nullish(),
  stop_count: z.number(),
  status: z.string(),
  updated_at: z.string().nullish(),
});

export type PinSuggestion = z.infer<typeof pinSuggestionSchema>;

export type SuggestionAckStatus = 'accepted' | 'dismissed';

/* -------------------------------------------------------------------------- */
/* Write payloads                                                              */
/* -------------------------------------------------------------------------- */

/** `PUT /api/locations/terminals/:id` — lat and long must travel together. */
export interface UpdateTerminalPayload {
  address?: string;
  lat?: number;
  long?: number;
  radius_m?: number;
  clear_radius?: boolean;
}

/** `POST /api/terminals` — resolve-or-create-or-extend for a company. */
export interface ResolveTerminalPayload {
  name: string;
  company: string;
}

/** `PUT /api/terminals/:id/receipt-patterns` — upsert per (terminal, company). */
export interface UpsertReceiptPatternPayload {
  /** Empty string means "applies to all companies". */
  company: string;
  pattern: string;
  description: string;
  active: boolean;
}

/** `POST /api/locations/dropoffs` */
export interface CreateDropoffPayload {
  name: string;
  lat?: number;
  long?: number;
  radius_m?: number;
}

/** `PUT /api/locations/dropoffs/:id` */
export interface UpdateDropoffPayload {
  lat: number;
  long: number;
  radius_m?: number;
  clear_radius?: boolean;
  pin_source?: string;
}
