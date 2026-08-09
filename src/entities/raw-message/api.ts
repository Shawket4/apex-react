import { apiClientRust } from '@/shared/api/client';
import {
  rawMessagesSchema,
  tagsSchema,
  type RawMessage,
  type ReclassifyAs,
  type Tag,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* Raw messages                                                                */
/* -------------------------------------------------------------------------- */

/** Messages that looked like bank SMS but did not fully parse, most-repeated
 *  skeleton first — that ordering is what makes the queue worth working. */
export async function getReviewQueue(limit = 100): Promise<RawMessage[]> {
  const res = await apiClientRust.get('/api/v1/raw/review', { params: { limit } });
  return rawMessagesSchema.parse(res.data ?? []);
}

/** What the triage gate rejected. Auditing this is how false negatives — a real
 *  bank SMS wrongly ignored — get found. */
export async function getIgnored(limit = 100): Promise<RawMessage[]> {
  const res = await apiClientRust.get('/api/v1/raw/ignored', { params: { limit } });
  return rawMessagesSchema.parse(res.data ?? []);
}

export async function getRawMessages(
  status: string | undefined,
  limit = 100,
): Promise<RawMessage[]> {
  const res = await apiClientRust.get('/api/v1/raw', {
    params: { ...(status ? { status } : {}), limit },
  });
  return rawMessagesSchema.parse(res.data ?? []);
}

/**
 * Correct the triage gate.
 *
 * `transaction` puts a wrongly-ignored message back through the parser.
 * `noise` records its skeleton so every future message with that shape is
 * auto-ignored — which is what stops the queue refilling with the same chatter.
 */
export async function reclassify(id: number, as_: ReclassifyAs): Promise<void> {
  await apiClientRust.post(`/api/v1/raw/${id}/reclassify`, { as: as_ });
}

export async function reparseOne(id: number): Promise<void> {
  await apiClientRust.post(`/api/v1/raw/${id}/reparse`);
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                        */
/* -------------------------------------------------------------------------- */

export async function getTags(): Promise<Tag[]> {
  const res = await apiClientRust.get('/api/v1/tags');
  return tagsSchema.parse(res.data ?? []);
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const res = await apiClientRust.post('/api/v1/tags', { name, color });
  return res.data as Tag;
}

export async function attachTag(transactionId: number, tagId: number): Promise<void> {
  await apiClientRust.post(`/api/v1/transactions/${transactionId}/tags`, { tag_id: tagId });
}

export async function detachTag(transactionId: number, tagId: number): Promise<void> {
  await apiClientRust.delete(`/api/v1/transactions/${transactionId}/tags/${tagId}`);
}
