import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* The garage maintenance system (maint-rust), as the office reads it          */
/*                                                                            */
/* Everything here is read-only and belongs to another service, so the         */
/* schemas are lenient on purpose: a field that goes missing, turns null or    */
/* gains a new value degrades to a dash on screen instead of failing the       */
/* whole response. Statuses stay plain strings for the same reason.            */
/* -------------------------------------------------------------------------- */

/** A text field: absent and null are the same thing. */
const text = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

/** A number that may arrive as a decimal string (liters, km). */
const num = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

/** A count: nothing sent means zero. */
const count = num.transform((value) => value ?? 0);

const flag = z
  .boolean()
  .nullish()
  .transform((value) => value ?? false);

function list<T extends z.ZodTypeAny>(item: T) {
  return z
    .array(item)
    .nullish()
    .transform((value) => value ?? []);
}

/* ------------------------------ Work orders ------------------------------- */

export const workOrderRowSchema = z
  .object({
    id: z.string(),
    vehicle_id: num,
    plate: text,
    /** 'open' | 'closed'; anything else is shown as it came. */
    status: z.string(),
    title: text,
    notes: text,
    opened_at: text,
    closed_at: text,
    odometer: num,
    task_count: count,
    done_count: count,
    oil_liters: num,
    tire_ops: count,
    /** Task names joined with "، ". */
    summary: text,
  })
  .passthrough();
export type WorkOrderRow = z.infer<typeof workOrderRowSchema>;

export const workOrdersPageSchema = z
  .object({
    rows: list(workOrderRowSchema),
    total: count,
    limit: count,
    offset: count,
  })
  .passthrough();
export type WorkOrdersPage = z.infer<typeof workOrdersPageSchema>;

export const workOrderTaskSchema = z
  .object({
    id: z.string(),
    description: text,
    category_id: text,
    category_ar: text,
    category_en: text,
    is_done: flag,
    done_at: text,
  })
  .passthrough();
export type WorkOrderTask = z.infer<typeof workOrderTaskSchema>;

export const workOrderOilChangeSchema = z
  .object({
    id: z.string(),
    oil_type: text,
    liters: num,
    odometer: num,
    /** The garage marked this change as needing a look. */
    flagged: flag,
    performed_at: text,
  })
  .passthrough();
export type WorkOrderOilChange = z.infer<typeof workOrderOilChangeSchema>;

export const workOrderTireWorkSchema = z
  .object({
    assignment_id: z.string(),
    tire_id: text,
    position_code: text,
    brand: text,
    model: text,
    size: text,
    dot_code: text,
    fitted_here: flag,
    removed_here: flag,
    mounted_at: text,
    mounted_odometer: num,
    mount_reason: text,
    dismounted_at: text,
    dismounted_odometer: num,
    dismount_reason: text,
  })
  .passthrough();
export type WorkOrderTireWork = z.infer<typeof workOrderTireWorkSchema>;

export const workOrderDetailSchema = z
  .object({
    work_order: workOrderRowSchema,
    tasks: list(workOrderTaskSchema),
    oil_changes: list(workOrderOilChangeSchema),
    tire_work: list(workOrderTireWorkSchema),
  })
  .passthrough();
export type WorkOrderDetail = z.infer<typeof workOrderDetailSchema>;

/* --------------------------- One truck's upkeep --------------------------- */

export const dueRowSchema = z
  .object({
    plan_id: z.string(),
    category_id: text,
    category_name_ar: text,
    category_name_en: text,
    interval_km: num,
    interval_days: num,
    last_at: text,
    last_km: num,
    current_odometer: num,
    next_due_km: num,
    next_due_at: text,
    /** Negative: late by that much. */
    km_remaining: num,
    days_remaining: num,
    /** 'overdue' | 'never_done' | 'due_soon' | 'unknown' | 'ok'. */
    status: z.string(),
  })
  .passthrough();
export type DueRow = z.infer<typeof dueRowSchema>;

export const tirePositionSchema = z
  .object({
    position_id: z.string(),
    position_code: text,
    is_spare: flag,
    spare_index: num,
    side: text,
    depth: text,
    /** 'tractor' | 'trailer' | null. */
    section: text,
    axle_index: num,
    is_steering: z
      .boolean()
      .nullish()
      .transform((value) => value ?? null),
    /** null: nothing is fitted here. */
    tire_id: text,
    brand: text,
    model: text,
    size: text,
    dot_code: text,
    total_km: num,
    mounted_at: text,
  })
  .passthrough();
export type TirePosition = z.infer<typeof tirePositionSchema>;

const odometerSchema = z
  .object({ km: num, source: text, observed_at: text })
  .passthrough();

const vehicleClassSchema = z
  .object({ id: z.string(), name_ar: text, name_en: text })
  .passthrough();

export const vehicleMaintenanceSchema = z
  .object({
    vehicle_id: num,
    odometer: odometerSchema.nullish().transform((value) => value ?? null),
    /** null: the truck has no maintenance class, so nothing is tracked. */
    class: vehicleClassSchema.nullish().transform((value) => value ?? null),
    open_work_orders: list(workOrderRowSchema),
    recent_work_orders: list(workOrderRowSchema),
    due: list(dueRowSchema),
    /** Empty: no wheel layout recorded yet. */
    tires: list(tirePositionSchema),
  })
  .passthrough();
export type VehicleMaintenance = z.infer<typeof vehicleMaintenanceSchema>;

/* --------------------------------- Tires ---------------------------------- */

export const maintTireSchema = z
  .object({
    id: z.string(),
    brand: text,
    model: text,
    size: text,
    dot_code: text,
    /** 'in_stock_used' | 'mounted' | 'in_repair' | 'retreading' | 'scrapped'. */
    status: z.string(),
    origin: text,
    total_km: num,
    retread_count: num,
    vehicle_id: num,
    plate: text,
    position_code: text,
    mounted_at: text,
  })
  .passthrough();
export type MaintTire = z.infer<typeof maintTireSchema>;

export const maintTiresPageSchema = z
  .object({
    rows: list(maintTireSchema),
    total: count,
    status_counts: z
      .record(num)
      .nullish()
      .transform((value): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const [status, n] of Object.entries(value ?? {})) out[status] = n ?? 0;
        return out;
      }),
  })
  .passthrough();
export type MaintTiresPage = z.infer<typeof maintTiresPageSchema>;

/* -------------------------------- Requests -------------------------------- */

export interface WorkOrdersParams {
  status?: 'open' | 'closed';
  vehicleId?: number;
  /** Plate text. */
  q?: string;
  /** YYYY-MM-DD. */
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export interface MaintTiresParams {
  status?: string;
  q?: string;
  limit: number;
  offset: number;
}
