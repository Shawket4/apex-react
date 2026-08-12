import { apiClientRust } from '@/shared/api/client';
import {
  messagePageSchema,
  messageSchema,
  type Message,
  type MessageFilters,
  type MessagePage,
} from './schemas';

const BASE = '/api/v1/messages';

/* ─── List (cursor-paginated) ─── */
export async function getMessages(
  filters: MessageFilters,
  cursor?: string | null,
  limit = 50,
): Promise<MessagePage> {
  const params: Record<string, string | number> = { limit };
  if (filters.status) params.status = filters.status;
  if (filters.q) params.q = filters.q;
  if (filters.include_media) params.include_media = filters.include_media;
  if (cursor) params.cursor = cursor;

  const response = await apiClientRust.get(BASE, { params });
  return messagePageSchema.parse(response.data);
}

/* ─── Single — the promotion form fetches by id so a refresh survives ─── */
export async function getMessage(id: number): Promise<Message> {
  const response = await apiClientRust.get(`${BASE}/${id}`);
  return messageSchema.parse(response.data);
}
