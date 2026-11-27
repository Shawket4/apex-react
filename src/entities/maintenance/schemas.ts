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

/** Counts by status. Absent (an older server) is an empty record. */
const statusCounts = z
  .record(num)
  .nullish()
  .transform((value): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [status, n] of Object.entries(value ?? {})) out[status] = n ?? 0;
    return out;
  });

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
    /** The same in English, where the garage has English names. */
    summary_en: text,
    /** Name of whoever opened the order. */
    opened_by: text,
  })
  .passthrough();
export type WorkOrderRow = z.infer<typeof workOrderRowSchema>;

export const workOrdersPageSchema = z
  .object({
    rows: list(workOrderRowSchema),
    total: count,
    limit: count,
    offset: count,
    /** Under the current filters, ignoring the status filter itself. */
    status_counts: statusCounts,
  })
  .passthrough();
export type WorkOrdersPage = z.infer<typeof workOrdersPageSchema>;

export const workOrderTaskSchema = z
  .object({
    id: z.string(),
    description: text,
    description_en: text,
    category_id: text,
    category_ar: text,
    category_en: text,
    is_done: flag,
    done_at: text,
    /** Name of whoever ticked the task; only on a done task. */
    done_by: text,
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
    /** 'left' | 'right' | null. */
    side: text,
    /** 'outer' | 'inner' | 'single' | null (maint-rust `position_depth`). */
    depth: text,
    /** 'tractor' | 'trailer' | null. */
    section: text,
    /** 1-based within its section. */
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
    status_counts: statusCounts,
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

/* -------------------------------------------------------------------------- */
/* Garage attendance: one month (GET /office/attendance?month=YYYY-MM)          */
/* -------------------------------------------------------------------------- */

const attendanceTotalsSchema = z
  .object({
    present: count,
    late: count,
    late_minutes: count,
    absent: count,
    leave: count,
    sick: count,
    off: count,
    unmarked: count,
    worked_minutes: count,
    extra_minutes: count,
  })
  .partial()
  .transform((t) => ({
    present: t.present ?? 0,
    late: t.late ?? 0,
    late_minutes: t.late_minutes ?? 0,
    absent: t.absent ?? 0,
    leave: t.leave ?? 0,
    sick: t.sick ?? 0,
    off: t.off ?? 0,
    unmarked: t.unmarked ?? 0,
    worked_minutes: t.worked_minutes ?? 0,
    extra_minutes: t.extra_minutes ?? 0,
  }));

export const attendanceCellSchema = z.object({
  /** present, late, absent, leave, sick, off, weekly_off, unmarked, future, outside */
  kind: z.string(),
  check_in_at: text,
  check_out_at: text,
  note: text,
  late_minutes: count,
  worked_minutes: num,
  marked_by: text,
});

export const attendanceMonthSchema = z.object({
  month: z.string(),
  first: z.string(),
  last: z.string(),
  today: z.string(),
  settings: z.object({
    work_start: z.string(),
    work_end: z.string(),
    late_grace_minutes: count,
    weekly_off_days: z.array(z.number()).catch([]),
    saved: flag,
  }),
  days: z.array(
    z.object({
      date: z.string(),
      day: z.number(),
      weekday: z.number(),
      is_weekly_off: flag,
      is_today: flag,
      is_future: flag,
    }),
  ),
  workers: z.array(
    z.object({
      worker_id: z.string(),
      name: z.string(),
      job: text,
      cells: z.array(attendanceCellSchema),
      totals: attendanceTotalsSchema,
    }),
  ),
  totals: attendanceTotalsSchema,
});

export type AttendanceMonth = z.infer<typeof attendanceMonthSchema>;
export type AttendanceCell = z.infer<typeof attendanceCellSchema>;
export type AttendanceTotals = AttendanceMonth['totals'];
