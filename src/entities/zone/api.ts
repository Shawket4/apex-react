import { apiClientEtit } from '@/shared/api/client';
import {
  zoneSchema,
  zoneScanResponseSchema,
  type CreateZonePayload,
  type UpdateZonePayload,
  type Zone,
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

async function deleteZone(id: number): Promise<Zone> {
  const res = await apiClientEtit.delete(`${PREFIX}/zones/${encodeURIComponent(id)}`);
  return zoneSchema.parse(res.data);
}

async function scanZones(): Promise<ZoneScanResponse> {
  const res = await apiClientEtit.post(`${PREFIX}/zones/scan`);
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
