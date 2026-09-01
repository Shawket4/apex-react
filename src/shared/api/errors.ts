import type { AxiosError } from 'axios';
import i18n from '@/shared/i18n';
import * as Sentry from '@sentry/react';

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = i18n.t('errors.unauthorized', { defaultValue: 'Unauthorized' })) {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = i18n.t('errors.forbidden', { defaultValue: 'Forbidden' })) {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = i18n.t('errors.notFound', { defaultValue: 'Not found' })) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = i18n.t('errors.network', { defaultValue: 'Network error' })) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Convert an axios error into a typed ApiError */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const ax = error as AxiosError<{ message?: string; error?: string }>;

  if (!ax.response) {
    return new NetworkError(
      ax.message ||
        i18n.t('errors.networkCheck', {
          defaultValue: 'Network error — please check your connection.',
        }),
    );
  }

  const message =
    ax.response.data?.message ||
    ax.response.data?.error ||
    ax.message ||
    i18n.t('errors.unexpected.message', { defaultValue: 'An unexpected error occurred' });

  switch (ax.response.status) {
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    default:
      return new ApiError(message, ax.response.status, ax.response.data);
  }
}

export function extractErrorMessage(
  error: unknown,
  fallback = i18n.t('errors.generic', { defaultValue: 'Something went wrong' }),
): string {
  // Report server faults on the way past.
  //
  // This is the funnel every "catch it and show a toast" path in the app goes
  // through — 51 call sites. Those catches are why a 500 could look like a
  // handled situation to the SDK: the exception never reached a global
  // handler, so Sentry heard nothing while the user saw a red toast.
  //
  // 4xx stays silent. That is the server telling a user something, not a bug,
  // and reporting it would bury the faults that are.
  reportIfServerFault(error);

  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Marks an error as already reported.
 *
 * The same failure can reach Sentry down two paths: a hook's own onError
 * calling extractErrorMessage, and the global query/mutation cache handler.
 * Both are wanted — the first covers non-query catches, the second covers
 * hooks that never call the first — but between them one failure would raise
 * two issues.
 */
const REPORTED = Symbol('apex.sentry.reported');

function reportIfServerFault(error: unknown): void {
  reportServerFault(error, 'handled-api-error');
}

/**
 * Report a server fault once, whichever path finds it first.
 *
 * 4xx stays silent: that is the server telling a user something, not a bug,
 * and reporting it would bury the faults that are. A missing status means the
 * request never got an answer at all — a network or CORS failure — which is
 * worth knowing about.
 */
export function reportServerFault(error: unknown, source: string, entity?: string): void {
  const status =
    error instanceof ApiError
      ? error.status
      : (error as { response?: { status?: number } } | null)?.response?.status;

  if (typeof status === 'number' && status < 500) return;
  if (!(error instanceof Error)) return;

  const marked = error as Error & { [REPORTED]?: boolean };
  if (marked[REPORTED]) return;
  marked[REPORTED] = true;

  Sentry.captureException(error, {
    tags: entity ? { source, entity } : { source },
  });
}
