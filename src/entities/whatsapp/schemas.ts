import { z } from 'zod';

export const whatsappStatusSchema = z.object({
  is_connected: z.boolean(),
  is_logged_in: z.boolean(),
  jid: z.string(),
});

export type WhatsAppStatus = z.infer<typeof whatsappStatusSchema>;
