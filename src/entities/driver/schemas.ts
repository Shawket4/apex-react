import { z } from 'zod';
import i18n from '@/shared/i18n';

/* ──────────────────────────────────────────────────────────────────────────
   Wire schema — matches exactly what the Go backend returns.
   Field names MUST NOT change.
   ────────────────────────────────────────────────────────────────────────── */

export const driverSchema = z.object({
  ID: z.number(),
  name: z.string(),
  mobile_number: z.string().optional().nullable(),
  transporter: z.string().optional().nullable(),
  social_security_number: z.string().optional().nullable(),
  is_approved: z.coerce.boolean().optional().nullable(),

  // The expiry dates of the driver's dated papers (YYYY-MM-DD). The papers
  // themselves, their files and their history are documents; the server
  // keeps these four in step with them so lists can sort and flag by date.
  id_license_expiration_date: z.string().optional().nullable(),
  driver_license_expiration_date: z.string().optional().nullable(),
  safety_license_expiration_date: z.string().optional().nullable(),
  drug_test_expiration_date: z.string().optional().nullable(),
});

export type Driver = z.infer<typeof driverSchema>;
export const driversResponseSchema = z.array(driverSchema);

/* ──────────────────────────────────────────────────────────────────────────
   Unregistered driver sentinel (used by the trip module).
   Selecting "unregistered" in the driver dropdown saves driver_id=0 and
   driver_name='غير مسجل' on the trip.
   ────────────────────────────────────────────────────────────────────────── */

export const UNREGISTERED_DRIVER_ID = 0;
export const UNREGISTERED_DRIVER_NAME = 'غير مسجل';

/* ──────────────────────────────────────────────────────────────────────────
   Form schema — for the Add / Edit driver dialog. Only the name is required.
   A driver's papers and their dates are added as documents, not here.
   ────────────────────────────────────────────────────────────────────────── */

export const driverFormSchema = z.object({
  name: z.string().refine((value) => value.trim().length > 0, () => ({
    message: i18n.t('drivers.validation.nameRequired'),
  })),
  mobile_number: z.string(),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

/** What a driver save sends. A field left out is left as it is on the server. */
export interface DriverPayload {
  name: string;
  mobile_number: string;
}

export function driverPayload(values: DriverFormValues): DriverPayload {
  return { name: values.name.trim(), mobile_number: values.mobile_number.trim() };
}
