import { z } from 'zod';

/**
 * The "mappings" endpoints power the Company → Terminal → Drop-off cascade
 * in the trip form. Each (company, terminal, drop-off) triple carries a fee
 * and distance derived from backend config.
 */

export const companiesResponseSchema = z.object({
  data: z.array(z.string()),
});
export type CompaniesResponse = z.infer<typeof companiesResponseSchema>;

export const terminalsResponseSchema = z.object({
  data: z.array(z.string()),
});
export type TerminalsResponse = z.infer<typeof terminalsResponseSchema>;

/**
 * One mapping entry per drop-off point. The backend returns a dictionary keyed
 * by drop-off-point name, but callers usually want the list of point names and
 * a lookup of details, so we expose both.
 */
export const mappingDetailSchema = z.object({
  distance: z.number().or(z.string()),
  fee: z.number().or(z.string()),
  fee_category: z.string().optional(),
  route_name: z.string().optional(),
}).passthrough();
export type MappingDetail = z.infer<typeof mappingDetailSchema>;

export const dropOffsResponseSchema = z.object({
  data: z.array(z.string()),
  mappings: z.record(z.string(), mappingDetailSchema).default({}),
});
export type DropOffsResponse = z.infer<typeof dropOffsResponseSchema>;
