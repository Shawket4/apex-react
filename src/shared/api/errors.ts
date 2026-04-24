import type { AxiosError } from 'axios';

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
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Convert an axios error into a typed ApiError */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const ax = error as AxiosError<{ message?: string; error?: string }>;

  if (!ax.response) {
    return new NetworkError(ax.message || 'Network error — please check your connection.');
  }

  const message =
    ax.response.data?.message ||
    ax.response.data?.error ||
    ax.message ||
    'An unexpected error occurred';

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

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
