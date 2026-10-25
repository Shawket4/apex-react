import { apiClientEtit } from '@/shared/api/client';
import {
  zoneSchema,
  zoneScanResponseSchema,
  type CreateZonePayload,
  type UpdateZonePayload,
  type Zone,
  type ZoneScanRange,
  type ZoneScanResponse,
} from './schemas';
import { z } from 'zod';

const PREFIX = 'api/v1';

async function listZones(activeOnly?: boolean): Promise<Zone[]> {
  const params = new URLSearchParams();
  if (activeOnly) {
    params.set('active', 'true');
  }
  const res = await apiClientEtit.get(`${PREFIX}/zones?${params}`);
  return z.array(zoneSchema).parse(res.data);
}

async function getZone(id: number): Promise<Zone> {
  const res = await apiClientEtit.get(`${PREFIX}/zones/${encodeURIComponent(id)}`);
  return zoneSchema.parse(res.data);
}

async function createZone(payload: CreateZonePayload): Promise<Zone> {
  const res = await apiClientEtit.post(`${PREFIX}/zones`, payload);
  return zoneSchema.parse(res.data);
}

async function updateZone(id: number, payload: UpdateZonePayload): Promise<Zone> {
  const res = await apiClientEtit.put(`${PREFIX}/zones/${encodeURIComponent(id)}`, payload);
  return zoneSchema.parse(res.data);
}

/** The proxy answers a delete with `{"success": true}`, not the zone. Parsing
 *  that as a zone threw, so every successful delete toasted an error. */
export const deleteZoneResponseSchema = z.object({ success: z.literal(true) });

async function deleteZone(id: number): Promise<void> {
  const res = await apiClientEtit.delete(`${PREFIX}/zones/${encodeURIComponent(id)}`);
  deleteZoneResponseSchema.parse(res.data);
}

/**
 * With no `range`, runs the scheduled round — it may alert the WhatsApp group.
 * With a `range`, runs a manual scan over those inclusive local days: the
 * violations come back in `violations` and nobody is notified.
 */
async function scanZones(range?: ZoneScanRange): Promise<ZoneScanResponse> {
  const res = await apiClientEtit.post(`${PREFIX}/zones/scan`, range);
  return zoneScanResponseSchema.parse(res.data);
}

export const zoneApi = {
  listZones,
  getZone,
  createZone,
  updateZone,
  deleteZone,
  scanZones,
} as const;
