import { apiClient } from '@/shared/api/client';
import { whatsappStatusSchema, type WhatsAppStatus } from './schemas';

const PREFIX = '/api/protected';

async function getStatus(): Promise<WhatsAppStatus> {
  const res = await apiClient.get(`${PREFIX}/CheckWPLogin`);
  return whatsappStatusSchema.parse(res.data);
}

async function reconnect(): Promise<WhatsAppStatus> {
  const res = await apiClient.post(`${PREFIX}/WhatsAppReconnect`);
  return whatsappStatusSchema.parse(res.data);
}

async function getQrCode(): Promise<Blob> {
  const res = await apiClient.get(`${PREFIX}/GetWhatsAppQRCode`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}

export const whatsappApi = { getStatus, reconnect, getQrCode };
