import { z } from 'zod';
import { zIntegerNonNegative, zNumericPositive, zDateString } from '@/shared/lib/zod-utils';

/* -------------------------------------------------------------------------- */
/* Status thresholds                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Single source of truth for oil-change status thresholds, expressed as
 * **kilometres of remaining service life** before the next change is due.
 *
 *   kmRemaining ≤ CRITICAL → "Critical" (overdue or imminent)
 *   kmRemaining ≤ WARNING  → "Warning" (schedule the change soon)
 *   otherwise              → "Good"
 *
 * Tweak these in one place; every chart, badge, filter, and Excel cell
 * reads from here.
 */
export const OIL_CHANGE_THRESHOLDS = {
  CRITICAL: 1500,
  WARNING: 3000,
} as const;

export type OilChangeStatus = 'good' | 'warning' | 'critical';

/**
 * Map a `kmRemaining` figure to a discrete status. The function is the
 * one and only place where the inequality direction is encoded —
 * everything else (badge colours, filter logic, Excel font colours)
 * derives from this.
 */
export function getOilChangeStatus(kmRemaining: number): OilChangeStatus {
  if (kmRemaining <= OIL_CHANGE_THRESHOLDS.CRITICAL) return 'critical';
  if (kmRemaining <= OIL_CHANGE_THRESHOLDS.WARNING) return 'warning';
  return 'good';
}

/* -------------------------------------------------------------------------- */
/* Wire shape                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Wire-shape for oil-change records returned by the Go backend.
 *
 * Field names MUST stay exactly as the backend emits them — including the
 * typo'd `super_visor`. The UI maps to `supervisor` at the form boundary,
 * never here. `mileage` here means **service interval** (km between oil
 * changes), not "current km driven" — keeping the legacy name avoids a
 * breaking server-side rename.
 *
 * `current_odometer` defaults to `odometer_at_change` on create and is
 * updated over time as the vehicle accumulates km. `kmRemaining` is
 * derived (`mileage - (current_odometer - odometer_at_change)`) and never
 * stored.
 */
export const oilChangeSchema = z.object({
  ID: z.number(),
  car_no_plate: z.string(),
  super_visor: z.string().optional().default(''),
  driver_id: z.number().optional().nullable(),
  driver_name: z.string().optional().default(''),
  date: z.string(),
  mileage: z.coerce.number(),
  odometer_at_change: z.coerce.number(),
  current_odometer: z.coerce.number(),
  cost: z.coerce.number(),
  // The Go backend emits `updated_at` for some endpoints and `UpdatedAt`
  // for others — coerce both into a single optional field.
  updated_at: z.string().optional().nullable(),
  UpdatedAt: z.string().optional().nullable(),
});

export type OilChange = z.infer<typeof oilChangeSchema>;
export const oilChangesResponseSchema = z.array(oilChangeSchema);

/* -------------------------------------------------------------------------- */
/* Derived view-model                                                          */
/* -------------------------------------------------------------------------- */

/**
 * UI-side projection that adds the derived figures every consumer needs.
 * Built once in the entity layer so we don't repeat the arithmetic across
 * the table, the history page, the form preview, and the Excel export.
 */
export interface OilChangeView extends OilChange {
  /** km the vehicle has driven since this change */
  kmUsed: number;
  /** km remaining before the next change is due */
  kmRemaining: number;
  /** Status bucket for badges/filters */
  status: OilChangeStatus;
  /** Last-updated ISO string (resolves the snake_case / PascalCase split) */
  lastUpdated: string | null;
}

export function toOilChangeView(o: OilChange): OilChangeView {
  const kmUsed = Math.max(0, o.current_odometer - o.odometer_at_change);
  const kmRemaining = o.mileage - kmUsed;
  return {
    ...o,
    kmUsed,
    kmRemaining,
    status: getOilChangeStatus(kmRemaining),
    lastUpdated: o.updated_at ?? o.UpdatedAt ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Form shape                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Form values collected by the create/edit form. Note we expose the
 * UI-friendly `supervisor` here; the API layer maps it back to the
 * server's `super_visor` field. `current_odometer` is optional in the
 * schema — on create the API layer defaults it to `odometer_at_change`.
 */
export const oilChangeFormSchema = z
  .object({
    car_id: z.number({ required_error: 'Please select a vehicle' }),
    date: zDateString,
    driver_id: z.number().optional().nullable(),
    driver_name: z.string().min(1, 'Driver name is required'),
    supervisor: z.string().min(1, 'Supervisor is required'),
    odometer_at_change: zIntegerNonNegative,
    current_odometer: zIntegerNonNegative.optional(),
    mileage: zNumericPositive,
    cost: zNumericPositive,
  })
  .refine(
    (v) =>
      v.current_odometer === undefined ||
      v.current_odometer >= v.odometer_at_change,
    {
      message: 'Current odometer cannot be less than the reading at change',
      path: ['current_odometer'],
    },
  );

export type OilChangeFormValues = z.infer<typeof oilChangeFormSchema>;

/* -------------------------------------------------------------------------- */
/* API payloads                                                                */
/* -------------------------------------------------------------------------- */

export interface AddOilChangePayload {
  car_id: number;
  date: string;
  super_visor: string;
  driver_id: number | null;
  driver_name: string;
  mileage: number;
  odometer_at_change: number;
  current_odometer: number;
  cost: number;
}

export interface EditOilChangePayload extends AddOilChangePayload {
  ID: number;
}
