import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_API_BASE_URL_RUST: z.string().url().optional(),
  VITE_API_BASE_URL_ETIT: z.string().url().optional(),
  VITE_APP_NAME: z.string().default('Apex'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
