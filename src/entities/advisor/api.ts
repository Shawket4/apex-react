import { z } from 'zod';
import i18n from '@/shared/i18n';
import {
  apiClientRust,
  apiRustBaseURL,
  authHeader,
  handleUnauthorized,
  platformFetch,
} from '@/shared/api/client';
import { ApiError, NetworkError } from '@/shared/api/errors';
import {
  advisorSearchResponseSchema,
  advisorStatusSchema,
  conversationDetailSchema,
  conversationSchema,
  digestSchema,
  suggestionSchema,
  type AdvisorSearchRequest,
  type AdvisorSearchResponse,
  type AdvisorStatus,
  type AdvisorStreamEvent,
  type Conversation,
  type ConversationDetail,
  type Digest,
  type Suggestion,
  type SuggestionStatus,
} from './schemas';
import { createSseParser, toAdvisorEvent } from './sse';

/**
 * AI fleet advisor on apex-rust (`apiClientRust`, all under `/api/v1/advisor`).
 * Everything is permission 4 except `/search` (1+).
 */
const PREFIX = '/api/v1/advisor';

async function getStatus(): Promise<AdvisorStatus> {
  const res = await apiClientRust.get(`${PREFIX}/status`);
  return advisorStatusSchema.parse(res.data);
}

async function listConversations(): Promise<Conversation[]> {
  const res = await apiClientRust.get(`${PREFIX}/conversations`);
  return z.array(conversationSchema).parse(res.data ?? []);
}

async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await apiClientRust.get(`${PREFIX}/conversations/${encodeURIComponent(id)}`);
  return conversationDetailSchema.parse(res.data);
}

async function deleteConversation(id: string): Promise<void> {
  await apiClientRust.delete(`${PREFIX}/conversations/${encodeURIComponent(id)}`);
}

export interface SuggestionFilters {
  status?: SuggestionStatus;
  conversation_id?: string;
}

async function listSuggestions(filters: SuggestionFilters = {}): Promise<Suggestion[]> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.conversation_id) params.conversation_id = filters.conversation_id;
  const res = await apiClientRust.get(`${PREFIX}/suggestions`, { params });
  return z.array(suggestionSchema).parse(res.data ?? []);
}

/** Applying goes through FalconGo server-side, so it can outlast the 15 s default. */
async function approveSuggestion(id: string): Promise<Suggestion> {
  const res = await apiClientRust.post(
    `${PREFIX}/suggestions/${encodeURIComponent(id)}/approve`,
    {},
    { timeout: 60_000 },
  );
  return suggestionSchema.parse(res.data);
}

async function rejectSuggestion(id: string): Promise<Suggestion> {
  const res = await apiClientRust.post(`${PREFIX}/suggestions/${encodeURIComponent(id)}/reject`, {});
  return suggestionSchema.parse(res.data);
}

async function search(body: AdvisorSearchRequest): Promise<AdvisorSearchResponse> {
  const res = await apiClientRust.post(`${PREFIX}/search`, body, { timeout: 20_000 });
  return advisorSearchResponseSchema.parse(res.data);
}

async function listDigests(): Promise<Digest[]> {
  const res = await apiClientRust.get(`${PREFIX}/digests`);
  return z.array(digestSchema).parse(res.data ?? []);
}

async function runDigest(days: number): Promise<void> {
  await apiClientRust.post(`${PREFIX}/digests/run`, { days });
}

/* -------------------------------------------------------------------------- */
/* Chat — a streamed POST                                                      */
/*                                                                             */
/* axios cannot hand over a response body as it arrives, so this one request   */
/* is a fetch, sent the way the axios clients send theirs: same base URL       */
/* (`apiRustBaseURL`), the `jwt` cookie (credentials: include) and the bearer  */
/* header, Tauri's HTTP plugin in Tauri production builds, and a 401 logs out. */
/* -------------------------------------------------------------------------- */

export interface ChatRequest {
  conversation_id?: string;
  message: string;
}

export interface StreamChatOptions {
  signal?: AbortSignal;
  onEvent: (event: AdvisorStreamEvent) => void;
}

async function readError(res: Response): Promise<ApiError> {
  let payload: unknown;
  let message = '';
  try {
    const text = await res.text();
    try {
      payload = JSON.parse(text);
      const p = payload as { message?: unknown; error?: unknown };
      message = String(p.message ?? p.error ?? '');
    } catch {
      message = text;
    }
  } catch {
    // body unreadable — fall through to the generic message
  }
  return new ApiError(
    message ||
      i18n.t('errors.unexpected.message', { defaultValue: 'An unexpected error occurred' }),
    res.status,
    payload,
  );
}

/**
 * Resolves once the stream has delivered its `answer`; rejects on an `error`
 * event, a non-2xx answer, a dropped connection, or a stream that closes with
 * neither. Every event (including the final one) reaches `onEvent` first.
 */
export async function streamChat(body: ChatRequest, { signal, onEvent }: StreamChatOptions) {
  let res: Response;
  try {
    res = await platformFetch(`${apiRustBaseURL}${PREFIX}/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...authHeader(),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new NetworkError();
  }

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw await readError(res);
  }
  if (!res.body) throw new NetworkError();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  let finished = false;
  let failure: string | null = null;

  const handle = (events: ReturnType<typeof parser.push>) => {
    for (const raw of events) {
      const event = toAdvisorEvent(raw);
      if (!event) continue;
      onEvent(event);
      if (event.type === 'answer') finished = true;
      if (event.type === 'error') failure = event.data.message;
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      handle(parser.push(decoder.decode(value, { stream: true })));
      if (finished || failure) break;
    }
    if (!finished && !failure) handle(parser.push(decoder.decode()).concat(parser.end()));
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new NetworkError();
  } finally {
    reader.cancel().catch(() => undefined);
  }

  if (failure) throw new ApiError(failure);
  if (!finished) {
    throw new ApiError(
      i18n.t('advisor.errors.streamEnded', {
        defaultValue: 'The advisor stopped before it answered. Try again.',
      }),
    );
  }
}

export const advisorApi = {
  getStatus,
  listConversations,
  getConversation,
  deleteConversation,
  listSuggestions,
  approveSuggestion,
  rejectSuggestion,
  search,
  listDigests,
  runDigest,
  streamChat,
} as const;
