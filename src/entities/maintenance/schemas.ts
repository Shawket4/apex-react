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

/** An earlier fitting of the tire (dismounted). */
export const tirePastMountSchema = z
  .object({
    vehicle_id: num,
    plate: text,
    position_code: text,
    mounted_at: text,
    mounted_odometer: num,
    /** maint-rust `mount_reason`. */
    mount_reason: text,
    dismounted_at: text,
    dismounted_odometer: num,
    /** maint-rust `dismount_reason`. */
    dismount_reason: text,
    /** Km between fitting and removal on a road wheel; null when unknown. */
    km_run: num,
  })
  .passthrough();
export type TirePastMount = z.infer<typeof tirePastMountSchema>;

/** A status change of the tire (repair, retread, scrap…). */
export const tireEventSchema = z
  .object({
    /** maint-rust `tire_event_type`. */
    event_type: text,
    from_status: text,
    to_status: text,
    notes: text,
    occurred_at: text,
  })
  .passthrough();
export type TireEvent = z.infer<typeof tireEventSchema>;

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
    /** The garage's axle id (an older server sends none). */
    axle_id: text,
    is_steering: z
      .boolean()
      .nullish()
      .transform((value) => value ?? null),
    /** A lifted (raised) axle; absent from an older server = on the road. */
    is_lifted: flag,
    /** null: nothing is fitted here. */
    tire_id: text,
    brand: text,
    model: text,
    size: text,
    dot_code: text,
    /** Lifetime km: before registration + every road fitting, this one so far. */
    total_km: num,
    mounted_at: text,
    /** maint-rust `tire_status`. */
    status: text,
    /** 'shipment' (new from stock) | 'legacy' (registered already in use). */
    origin: text,
    retread_count: num,
    /** Km the tire had before the garage registered it. */
    base_km: num,
    notes: text,
    registered_at: text,
    /** This fitting. */
    mounted_odometer: num,
    mount_reason: text,
    mount_notes: text,
    mounted_work_order_id: text,
    /** Km since this fitting (road wheels with a known odometer). */
    km_this_mount: num,
    /** Some road fitting has no odometer, so total_km is short of the truth. */
    km_incomplete: flag,
    past_mounts: list(tirePastMountSchema),
    events: list(tireEventSchema),
  })
  .passthrough();
export type TirePosition = z.infer<typeof tirePositionSchema>;

/* -------------------------------- Batteries ------------------------------- */

/** One battery as the garage records it: what it is, where it came from and
 * its warranty. A record exists once a battery is fitted from stock or
 * registered as already on a truck; new ones on the shelf are only a count. */
export const batterySchema = z
  .object({
    id: text,
    brand: text,
    model: text,
    capacity_ah: num,
    voltage: num,
    /** Cold cranking amps, when the garage recorded them. */
    cca: num,
    serial: text,
    date_code: text,
    warranty_months: num,
    /** 'installed' | 'in_stock_used' | 'charging' | 'warranty' | 'scrapped'. */
    status: text,
    /** 'stock' (new from the shelf) | 'legacy' (registered already on a truck). */
    origin: text,
    notes: text,
    registered_at: text,
    first_installed_at: text,
    /** First fitting + the warranty months; null when either is unknown. */
    warranty_until: text,
  })
  .passthrough();
export type Battery = z.infer<typeof batterySchema>;

const maybeBattery = batterySchema.nullish().transform((value) => value ?? null);

/** A battery in one of the truck's slots now. */
export const fittedBatterySchema = z
  .object({
    install_id: text,
    /** 1-based. */
    slot: num,
    battery: maybeBattery,
    installed_at: text,
    installed_odometer: num,
    work_order_id: text,
    /** Notes on this fitting (the battery's own are `battery.notes`). */
    notes: text,
    /** Km since this fitting; null with no odometer at fitting. */
    km_this_install: num,
  })
  .passthrough();
export type FittedBattery = z.infer<typeof fittedBatterySchema>;

/** An earlier fitting on this truck, taken off since. */
export const removedBatterySchema = z
  .object({
    install_id: text,
    slot: num,
    battery: maybeBattery,
    installed_at: text,
    installed_odometer: num,
    removed_at: text,
    removed_odometer: num,
    /** 'dead' | 'weak' | 'damaged' | 'moved' | 'warranty' | 'other'. */
    removal_reason: text,
    /** Where it went: 'in_stock_used' | 'charging' | 'warranty' | 'scrapped'. */
    removal_outcome: text,
    work_order_id: text,
    removal_work_order_id: text,
    notes: text,
    /** Km between fitting and removal; null when either reading is missing. */
    km_run: num,
  })
  .passthrough();
export type RemovedBattery = z.infer<typeof removedBatterySchema>;

export const vehicleBatteriesSchema = z
  .object({
    /** How many battery slots the truck has (the garage's default is 2). */
    slots: num,
    fitted: list(fittedBatterySchema),
    /** The last 20, newest first. */
    removed: list(removedBatterySchema),
  })
  .passthrough();
export type VehicleBatteries = z.infer<typeof vehicleBatteriesSchema>;

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
    /** null: an older garage system, which keeps no batteries. */
    batteries: vehicleBatteriesSchema.nullish().transform((value) => value ?? null),
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

/** A battery in the list of every battery, with where it is fitted now. */
export const maintBatterySchema = batterySchema
  .extend({
    id: z.string(),
    /** null: not on a truck. */
    vehicle_id: num,
    plate: text,
    slot: num,
    installed_at: text,
  })
  .passthrough();
export type MaintBattery = z.infer<typeof maintBatterySchema>;

export const maintBatteriesPageSchema = z
  .object({
    rows: list(maintBatterySchema),
    total: count,
    status_counts: statusCounts,
  })
  .passthrough();
export type MaintBatteriesPage = z.infer<typeof maintBatteriesPageSchema>;

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

/** Brand, model, serial, date code or plate in `q`. */
export type MaintBatteriesParams = MaintTiresParams;

/* -------------------------------------------------------------------------- */
/* Garage attendance: one month (GET /office/attendance?month=YYYY-MM)          */
/* -------------------------------------------------------------------------- */

const attendanceTotalsSchema = z
  .object({
    present: count,
    absent: count,
    leave: count,
    sick: count,
    unmarked: count,
  })
  .partial()
  .transform((t) => ({
    present: t.present ?? 0,
    absent: t.absent ?? 0,
    leave: t.leave ?? 0,
    sick: t.sick ?? 0,
    unmarked: t.unmarked ?? 0,
  }));

export const attendanceCellSchema = z.object({
  /** present, absent, leave, sick, unmarked, future, outside */
  kind: z.string(),
  check_in_at: text,
  check_out_at: text,
  note: text,
  marked_by: text,
});

export const attendanceMonthSchema = z.object({
  month: z.string(),
  first: z.string(),
  last: z.string(),
  today: z.string(),
  days: z.array(
    z.object({
      date: z.string(),
      day: z.number(),
      weekday: z.number(),
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
