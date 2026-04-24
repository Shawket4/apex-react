import { apiPost, apiGet } from '@/shared/api/client';
import { loginResponseSchema, type LoginInput, type LoginResponse } from './schemas';

export async function login(input: LoginInput): Promise<LoginResponse> {
  const data = await apiPost<unknown>('/api/login', input);
  return loginResponseSchema.parse(data);
}

export async function validateToken(): Promise<void> {
  await apiGet<unknown>('/api/validate-token');
}
