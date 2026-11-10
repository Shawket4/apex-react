import type { TFunction } from 'i18next';
import { ApiError, extractErrorMessage } from '@/shared/api/errors';

/**
 * The reasons FalconGo's documents package gives for refusing something. The
 * server sends the key; the sentence a person reads is in the translation
 * files (`documents.errors.<code>`), so it is in their language.
 */
export const DOCUMENT_ERROR_CODES = [
  'unknown_owner_kind',
  'unknown_type',
  'not_applicable',
  'empty',
  'label_taken',
  'label_too_long',
  'note_too_long',
  'invalid_date',
  'expiry_before_issue',
  'unknown_slot',
  'too_many_files',
  'duplicate_file',
  'file_in_use',
  'images_only',
  'empty_file',
  'file_too_large',
  'unsupported_type',
  'unreadable_image',
  'not_found',
  'forbidden',
  'invalid_body',
] as const;
export type DocumentErrorCode = (typeof DOCUMENT_ERROR_CODES)[number];

const KNOWN = new Set<string>(DOCUMENT_ERROR_CODES);

/** The server's code, or the one an HTTP status stands for when a proxy answered. */
export function documentErrorCode(error: unknown): DocumentErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code && KNOWN.has(error.code)) return error.code as DocumentErrorCode;
  // nginx refuses an oversized body itself, with no JSON and so no code.
  if (error.status === 413) return 'file_too_large';
  if (error.status === 403) return 'forbidden';
  return null;
}

export function documentErrorMessage(error: unknown, t: TFunction): string {
  const code = documentErrorCode(error);
  if (code) return t(`documents.errors.${code}`);
  return extractErrorMessage(error, t('documents.errors.generic'));
}
