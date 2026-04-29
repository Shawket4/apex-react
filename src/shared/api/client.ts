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

function createClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
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
    (response) => response,
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