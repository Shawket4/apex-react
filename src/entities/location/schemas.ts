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
/* -------------------------------------------------------------------------- */

export const terminalAliasSchema = z.object({
  ID: z.number(),
  alias: z.string(),
  terminal_id: z.number(),
});

export type TerminalAlias = z.infer<typeof terminalAliasSchema>;

export const terminalSchema = z.object({
  ID: z.number(),
  name: z.string(),
  address: z.string().nullish(),
  lat: z.number().nullish(),
  long: z.number().nullish(),
  radius_m: z.number().nullish(),
  aliases: z
    .array(terminalAliasSchema)
    .nullish()
    .transform((v) => v ?? []),
});

export type Terminal = z.infer<typeof terminalSchema>;

export const dropOffPointSchema = z.object({
  ID: z.number(),
  name: z.string(),
  lat: z.number().nullish(),
  long: z.number().nullish(),
  radius_m: z.number().nullish(),
  pin_source: z.string().nullish(),
});

export type DropOffPoint = z.infer<typeof dropOffPointSchema>;

export const unknownTerminalSchema = z.object({
  name: z.string(),
  trip_rows: z.number(),
});

export type UnknownTerminal = z.infer<typeof unknownTerminalSchema>;

export const locationsInboxSchema = z.object({
  unpinned_dropoffs: z
    .array(dropOffPointSchema)
    .nullish()
    .transform((v) => v ?? []),
  unknown_terminals: z
    .array(unknownTerminalSchema)
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
