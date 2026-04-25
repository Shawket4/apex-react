import { z } from 'zod';

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

  // License / cert expiration dates (YYYY-MM-DD strings)
  id_license_expiration_date: z.string().optional().nullable(),
  driver_license_expiration_date: z.string().optional().nullable(),
  safety_license_expiration_date: z.string().optional().nullable(),
  drug_test_expiration_date: z.string().optional().nullable(),

  // Document image filenames
  id_license_image_name: z.string().optional().nullable(),
  id_license_image_name_back: z.string().optional().nullable(),
  driver_license_image_name: z.string().optional().nullable(),
  driver_license_image_name_back: z.string().optional().nullable(),
  safety_license_image_name: z.string().optional().nullable(),
  drug_test_image_name: z.string().optional().nullable(),
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
   Form schema — for Add / Edit driver dialog.
   ────────────────────────────────────────────────────────────────────────── */

export const driverFormSchema = z.object({
  name: z.string().min(1, 'Please enter the driver name'),
  mobile_number: z.string().optional(),
  id_license_expiration_date: z.string().optional(),
  driver_license_expiration_date: z
    .string({ required_error: 'Please select a license expiry date' })
    .min(1, 'Please select a license expiry date'),
  safety_license_expiration_date: z
    .string({ required_error: 'Please select a safety certificate expiry' })
    .min(1, 'Please select a safety certificate expiry'),
  drug_test_expiration_date: z
    .string({ required_error: 'Please select a drug test expiry' })
    .min(1, 'Please select a drug test expiry'),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;

/* ──────────────────────────────────────────────────────────────────────────
   Payload types — what the API expects in the request body.
   ────────────────────────────────────────────────────────────────────────── */

export interface RegisterDriverPayload {
  name: string;
  mobile_number: string;
  id_license_expiration_date: string;
  driver_license_expiration_date: string;
  safety_license_expiration_date: string;
  drug_test_expiration_date: string;
  transporter: string;
}

export interface UpdateDriverPayload extends RegisterDriverPayload {
  id: number;
}

export interface UpdateDriverDocumentsPayload {
  ID: number;
  name: string;
  mobile_number: string;
  transporter: string;
  social_security_number: string;
  id_license_expiration_date: string;
  driver_license_expiration_date: string;
  safety_license_expiration_date: string;
  drug_test_expiration_date: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Expiration status helper type
   ────────────────────────────────────────────────────────────────────────── */

export type ExpirationStatus = 'valid' | 'warning' | 'expired' | 'unknown';

export interface ExpirationInfo {
  status: ExpirationStatus;
  daysLeft: number | null;
}
