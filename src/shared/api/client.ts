import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { env } from '@/shared/config/env';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { toApiError } from './errors';

type LogoutHandler = () => void;

let logoutHandler: LogoutHandler | null = null;

export function setLogoutHandler(handler: LogoutHandler): void {
  logoutHandler = handler;
}

const DEFAULT_TIMEOUT = 15_000;

/**
 * In Tauri dev mode the WebView's origin (localhost:5173) differs from the
 * API domain. Vite's dev proxy routes requests same-origin so the Go
 * backend's `jwt` cookie is included. `resolveBaseURL` strips the origin
 * to a relative path (e.g. `/api/go`) so the proxy intercepts the request.
 *
 * In production Tauri builds there is no proxy — requests go directly to
 * the API using the full URL with Bearer-token auth.
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

function createClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL: resolveBaseURL(baseURL),
    withCredentials: true,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(STORAGE_KEYS.JWT);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
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
    (error) => {
      const apiError = toApiError(error);

      if (apiError.status === 401) {
        if (logoutHandler) {
          logoutHandler();
        } else {
          Object.values(STORAGE_KEYS).forEach((k) => {
            if (k !== STORAGE_KEYS.LANGUAGE && k !== STORAGE_KEYS.THEME) {
              localStorage.removeItem(k);
            }
          });
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }

      return Promise.reject(apiError);
    },
  );

  return instance;
}

export const apiClient = createClient(env.VITE_API_BASE_URL);

export const apiClientRust = env.VITE_API_BASE_URL_RUST
  ? createClient(env.VITE_API_BASE_URL_RUST)
  : apiClient;

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