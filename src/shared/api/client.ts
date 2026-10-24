import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { ApiError, toApiError } from './errors';
import { isJsonBlob, readJsonBlob, unwrapBlobErrorBody } from './blob-error';

type LogoutHandler = () => void;

let logoutHandler: LogoutHandler | null = null;

export function setLogoutHandler(handler: LogoutHandler): void {
  logoutHandler = handler;
}

const DEFAULT_TIMEOUT = 15_000;

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const isTauriProd = !!window.__TAURI_INTERNALS__ && !import.meta.env.DEV;

/**
 * In Tauri dev mode the WebView's origin (localhost:5173) differs from the
 * API domain. Vite's dev proxy routes requests same-origin so the Go
 * backend's `jwt` cookie is included. `resolveBaseURL` strips the origin
 * to a relative path (e.g. `/api/go`) so the proxy intercepts the request.
 *
 * In production Tauri builds there is no proxy — requests go directly to
 * the API using the full URL.
 */
function resolveBaseURL(configuredURL: string): string {
  if (window.__TAURI_INTERNALS__ && import.meta.env.DEV) {
    try {
      return new URL(configuredURL).pathname; // e.g. "/api/go"
    } catch {
      return configuredURL;
    }
  }
  return configuredURL;
}

/** What a 401 does, wherever it was heard (axios here, the advisor's streaming fetch). */
export function handleUnauthorized(): void {
  if (logoutHandler) {
    logoutHandler();
    return;
  }
  Object.values(STORAGE_KEYS).forEach((k) => {
    if (k !== STORAGE_KEYS.LANGUAGE && k !== STORAGE_KEYS.THEME) {
      localStorage.removeItem(k);
    }
  });
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

/** The bearer header every client sends (the `jwt` cookie rides along via credentials). */
export function authHeader(): Record<string, string> {
  const token = localStorage.getItem(STORAGE_KEYS.JWT);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function createClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL: resolveBaseURL(baseURL),
    withCredentials: true,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    // Use the native fetch adapter in Tauri production, but override the
    // global fetch with Tauri's HTTP plugin. This routes requests through
    // Rust, bypassing Android WebView CORS and mixed-content issues.
    ...(isTauriProd && {
      adapter: async (config) => {
        const fullUrl = axios.getUri(config);
        const url = new URL(fullUrl, window.location.origin);

        const headers = new Headers();
        if (config.headers) {
          Object.entries(config.headers).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
              headers.set(k, String(v));
            }
          });
        }

        const requestInit: RequestInit = {
          method: config.method?.toUpperCase() || 'GET',
          headers,
          body: config.data
            ? typeof config.data === 'string'
              ? config.data
              : JSON.stringify(config.data)
            : undefined,
        };

        const response = await tauriFetch(url.toString(), requestInit);

        let data: any;
        if (config.responseType === 'arraybuffer') {
          data = await response.arrayBuffer();
        } else if (config.responseType === 'blob') {
          data = await response.blob();
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }

        const axiosResponse = {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as any,
          config,
          request: response,
        };

        const validateStatus = config.validateStatus || ((status) => status >= 200 && status < 300);

        if (!validateStatus(response.status)) {
          throw new axios.AxiosError(
            `Request failed with status code ${response.status}`,
            axios.AxiosError.ERR_BAD_REQUEST,
            config,
            response,
            axiosResponse
          );
        }

        return axiosResponse;
      },
    }),
  });

  instance.interceptors.request.use((config) => {
    const { Authorization } = authHeader();
    if (Authorization) {
      config.headers.Authorization = Authorization;
    }
    return config;
  });

  instance.interceptors.response.use(
    async (response) => {
      // A download that answered 2xx with a JSON message instead of a file
      // is a refusal, not a file to save.
      if (response.config?.responseType === 'blob' && isJsonBlob(response.data)) {
        const body = (await readJsonBlob(response.data)) as
          | { message?: string; error?: string }
          | undefined;
        const message = body?.error || body?.message;
        if (message) throw new ApiError(message, response.status, body);
      }
      // The Vite dev proxy can return JSON bodies as raw strings when the
      // Content-Type header is mangled in transit. Auto-parse to keep
      // downstream Zod schemas happy.
      if (typeof response.data === 'string') {
        try {
          response.data = JSON.parse(response.data);
        } catch {
          // Not JSON — leave as-is (e.g. plain-text error messages)
        }
      }
      return response;
    },
    async (error) => {
      // Blob downloads get their JSON error body as a Blob; read it back so
      // the server's message and code reach the toast.
      await unwrapBlobErrorBody(error);
      const apiError = toApiError(error);

      if (apiError.status === 401) handleUnauthorized();

      return Promise.reject(apiError);
    },
  );

  return instance;
}

export const apiClient = createClient(env.VITE_API_BASE_URL);

export const apiClientRust = env.VITE_API_BASE_URL_RUST
  ? createClient(env.VITE_API_BASE_URL_RUST)
  : apiClient;

/**
 * apex-rust's base for requests axios cannot make — a streamed POST body
 * (`/api/v1/advisor/chat`). Resolved exactly like `apiClientRust`'s baseURL,
 * including its fall back to the Go base when the Rust one is unset.
 */
export const apiRustBaseURL = resolveBaseURL(
  env.VITE_API_BASE_URL_RUST || env.VITE_API_BASE_URL,
).replace(/\/+$/, '');

/** `fetch` as the axios clients send it: Tauri's HTTP plugin in Tauri production builds. */
export const platformFetch: typeof fetch = isTauriProd
  ? (input, init) => tauriFetch(input, init)
  : (input, init) => fetch(input, init);

export const apiClientEtit = env.VITE_API_BASE_URL_ETIT
  ? createClient(env.VITE_API_BASE_URL_ETIT)
  : apiClient;

/** Typed helper — axios instance returns unknown response data by default in strict TS */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}