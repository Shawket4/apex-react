import type { AxiosInstance } from 'axios';
import { apiClientMaint } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import {
  importResultSchema,
  maintCategoriesSchema,
  unmatchedPageSchema,
  type ImportResult,
  type LegacyDecision,
  type MaintCategory,
  type UnmatchedPage,
} from './schemas';

function client(): AxiosInstance {
  if (!apiClientMaint) throw new Error('Maintenance API is not configured');
  return apiClientMaint;
}

/** `GET /office/legacy/unmatched`: most common wording first, 300 at most. */
export async function getUnmatched(): Promise<UnmatchedPage> {
  const res = await client().get('/office/legacy/unmatched');
  return unmatchedPageSchema.parse(res.data);
}

/** `GET /categories`: the maintenance types a wording can be matched to. */
export async function getMaintCategories(): Promise<MaintCategory[]> {
  const res = await client().get('/categories');
  return maintCategoriesSchema.parse(res.data);
}

/** `POST /office/legacy/decide` (level 3). Applies to every line so worded. */
export async function decideWording(decision: LegacyDecision): Promise<void> {
  await client().post('/office/legacy/decide', decision);
}

/**
 * The outcome of asking the server to read the invoices again. "Not set up"
 * is an answer, not a failure: the server has no access to the invoice
 * database, and no retry will change that.
 */
export type ImportOutcome =
  | { kind: 'done'; result: ImportResult }
  | { kind: 'not-set-up' };

/** `POST /office/legacy/import` (level 3). 503: the server cannot see invoices. */
export async function importLegacyNow(): Promise<ImportOutcome> {
  try {
    // Reading every old invoice takes longer than a page load.
    const res = await client().post('/office/legacy/import', undefined, { timeout: 120_000 });
    return { kind: 'done', result: importResultSchema.parse(res.data) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) return { kind: 'not-set-up' };
    throw error;
  }
}
