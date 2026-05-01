import { z } from 'zod';
import { zIntegerNonNegative, zNumericPositive, zDateString } from '@/shared/lib/zod-utils';

/* -------------------------------------------------------------------------- */
/* Method                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Known fuel-event source methods. `PetroApp` rows originate from the
 * PetroApp integration (authoritative driver/transporter from station data);
 * `Manual` rows are entered by dispatchers. Kept as a string union at the
 * type level but stored as `z.string()` so older rows with missing or
 * unexpected values still parse — they're normalised at the filter boundary.
 */
export const FUEL_METHOD_PETROAPP = 'PetroApp';
export const FUEL_METHOD_MANUAL = 'Manual';

export type FuelMethod = 'PetroApp' | 'Manual';

/**
 * Normalise a raw method string to a known `FuelMethod`. Missing or unknown
 * values default to `Manual` — a reasonable fallback for legacy rows and the
 * closest match for non-integrated data sources.
 */
export function normaliseMethod(m: string | null | undefined): FuelMethod {
  return m === FUEL_METHOD_PETROAPP ? FUEL_METHOD_PETROAPP : FUEL_METHOD_MANUAL;
}

/* -------------------------------------------------------------------------- */
/* Wire shape                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Wire-shape for fuel events returned by the backend.
 * Field names MUST NOT change — they are what the Go backend emits.
 */
export const fuelEventSchema = z.object({
  ID: z.number(),
  car_id: z.number().optional().nullable(),
  car_no_plate: z.string(),
  driver_id: z.number().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  date: z.string(),
  time: z.string().optional().nullable(),
  liters: z.coerce.number(),
  price_per_liter: z.coerce.number(),
  price: z.coerce.number(),
  fuel_rate: z.coerce.number(),
  odometer_before: z.coerce.number(),
  odometer_after: z.coerce.number(),
  method: z.string().optional().default(FUEL_METHOD_MANUAL),
});

export type FuelEvent = z.infer<typeof fuelEventSchema>;
export const fuelEventsResponseSchema = z.array(fuelEventSchema);

/* -------------------------------------------------------------------------- */
/* Form shape                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Form shape — what the UI collects before sending to the backend.
 * Validates using zod then gets transformed into the API payload.
 * Note: `method` is server-stamped, never user-input, so it's absent here.
 */
export const fuelEventFormSchema = z
  .object({
    car_id: z.number({ required_error: 'Please select a vehicle' }),
    driver_id: z.number().optional().nullable(),
    driver_name: z
      .string({ required_error: 'Please select a driver' })
      .min(1, 'Please select a driver'),
    date: zDateString,
    liters: zNumericPositive,
    price_per_liter: zNumericPositive,
    odometer_before: zIntegerNonNegative,
    odometer_after: zIntegerNonNegative,
  })
  .refine((data) => data.odometer_after > data.odometer_before, {
    message: 'Current reading must be greater than previous reading',
    path: ['odometer_after'],
  });

export type FuelEventFormValues = z.infer<typeof fuelEventFormSchema>;

/* -------------------------------------------------------------------------- */
/* API payloads + filters                                                      */
/* -------------------------------------------------------------------------- */

/** Add-request payload shape the Go backend expects at POST /api/protected/AddFuelEvent */
export interface AddFuelEventPayload {
  car_id: number;
  date: string;
  liters: number;
  price_per_liter: number;
  odometer_before: number;
  odometer_after: number;
  driver_id: number | null;
  driver_name: string;
}

/** Edit-request payload shape expected at POST /api/protected/EditFuelEvent */
export interface EditFuelEventPayload extends AddFuelEventPayload {
  ID: number;
}

/**
 * Query filters for the list endpoint.
 * `from`/`to` are ISO timestamps (UTC) — the DateRangePicker produces these
 * directly, and they serialize cleanly into react-query keys.
 */
export interface FuelEventsFilter {
  from?: string | null;
  to?: string | null;
  petroAppOnly?: boolean;
}