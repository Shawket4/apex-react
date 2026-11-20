import { describe, expect, it } from 'vitest';
import {
  maintTiresPageSchema,
  vehicleMaintenanceSchema,
  workOrderDetailSchema,
  workOrdersPageSchema,
} from './schemas';

const openOrder = {
  id: '6f0c1f0e-6f3b-4a53-9c0e-0d1f4f1f2a11',
  vehicle_id: 42,
  plate: 'أ ب ج 1234',
  status: 'open',
  title: null,
  notes: null,
  opened_at: '2026-11-18T07:30:00Z',
  closed_at: null,
  odometer: null,
  task_count: 3,
  done_count: 1,
  oil_liters: null,
  tire_ops: 0,
  summary: 'تغيير تيل فرامل، ظبط زوايا',
};

describe('workOrdersPageSchema', () => {
  it('reads a page with nulls and keeps fields it does not know', () => {
    const page = workOrdersPageSchema.parse({
      rows: [openOrder, { ...openOrder, id: 'b', status: 'closed', oil_liters: 38.5, extra: 1 }],
      total: 2,
      limit: 20,
      offset: 0,
    });
    expect(page.rows).toHaveLength(2);
    expect(page.rows[0]).toMatchObject({ plate: 'أ ب ج 1234', odometer: null, done_count: 1 });
    expect(page.rows[1]).toMatchObject({ status: 'closed', oil_liters: 38.5, extra: 1 });
  });

  it('degrades when the server drops or renames things', () => {
    const page = workOrdersPageSchema.parse({
      rows: [{ id: 'x', status: 'on_hold', oil_liters: '12.50' }],
    });
    expect(page.total).toBe(0);
    expect(page.rows[0]).toMatchObject({
      status: 'on_hold',
      plate: null,
      vehicle_id: null,
      task_count: 0,
      oil_liters: 12.5,
      summary: null,
    });
    expect(workOrdersPageSchema.parse({}).rows).toEqual([]);
  });
});

describe('workOrderDetailSchema', () => {
  it('reads tasks, oil changes and tire work', () => {
    const detail = workOrderDetailSchema.parse({
      work_order: openOrder,
      tasks: [
        {
          id: 't1',
          description: null,
          category_id: 'brakes',
          category_ar: 'فرامل',
          category_en: 'Brakes',
          is_done: true,
          done_at: '2026-11-18T09:00:00Z',
        },
        { id: 't2', description: 'لحام شكمان', category_id: null, is_done: false, done_at: null },
      ],
      oil_changes: [
        { id: 'o1', oil_type: '15W-40', liters: 38, odometer: null, flagged: true, performed_at: '2026-11-18T10:00:00Z' },
      ],
      tire_work: [
        {
          assignment_id: 'a1',
          tire_id: 'tire-1',
          position_code: null,
          brand: 'Bridgestone',
          model: null,
          size: '315/80R22.5',
          dot_code: null,
          fitted_here: false,
          removed_here: true,
          mounted_at: '2026-03-01T08:00:00Z',
          mounted_odometer: 410000,
          mount_reason: 'new',
          dismounted_at: '2026-11-18T08:00:00Z',
          dismounted_odometer: null,
          dismount_reason: 'worn',
        },
      ],
    });
    expect(detail.tasks[1]).toMatchObject({ category_ar: null, category_en: null, is_done: false });
    expect(detail.oil_changes[0]?.flagged).toBe(true);
    expect(detail.tire_work[0]).toMatchObject({ removed_here: true, position_code: null });
  });

  it('treats missing lists as empty', () => {
    const detail = workOrderDetailSchema.parse({ work_order: openOrder });
    expect(detail.tasks).toEqual([]);
    expect(detail.oil_changes).toEqual([]);
    expect(detail.tire_work).toEqual([]);
  });

  it('still refuses a body with no work order', () => {
    expect(workOrderDetailSchema.safeParse({ tasks: [] }).success).toBe(false);
  });
});

describe('vehicleMaintenanceSchema', () => {
  it('reads an untracked truck: no class, no odometer, no layout', () => {
    const data = vehicleMaintenanceSchema.parse({
      vehicle_id: 7,
      odometer: null,
      class: null,
      open_work_orders: [],
      recent_work_orders: [],
      due: [],
      tires: [],
    });
    expect(data.class).toBeNull();
    expect(data.odometer).toBeNull();
    expect(data.tires).toEqual([]);
  });

  it('reads due rows and wheel positions, empty ones included', () => {
    const data = vehicleMaintenanceSchema.parse({
      vehicle_id: 7,
      odometer: { km: 512340, source: 'falcon_mileage', observed_at: '2026-11-19T22:00:00Z' },
      class: { id: 'tractor-6x4', name_ar: 'جرار', name_en: 'Tractor' },
      open_work_orders: [openOrder],
      recent_work_orders: [],
      due: [
        {
          plan_id: 'p1',
          vehicle_id: 7,
          category_id: 'gearbox_oil',
          category_name_ar: 'زيت فتيس',
          category_name_en: 'Gearbox oil',
          interval_km: 60000,
          interval_days: null,
          last_at: null,
          last_km: null,
          current_odometer: 512340,
          next_due_km: null,
          next_due_at: null,
          km_remaining: -2340,
          days_remaining: null,
          status: 'overdue',
        },
        { plan_id: 'p2', category_id: 'x', status: 'unknown' },
      ],
      tires: [
        {
          position_id: 'pos1',
          position_code: 'T1L',
          is_spare: false,
          spare_index: null,
          side: 'left',
          depth: 'single',
          section: 'tractor',
          axle_index: 1,
          is_steering: true,
          tire_id: null,
          brand: null,
          model: null,
          size: null,
          dot_code: null,
          total_km: null,
          mounted_at: null,
        },
        { position_id: 'pos2', position_code: 'S1', is_spare: true, tire_id: 't9', total_km: '8200', depth: 'under' },
      ],
    });
    expect(data.odometer?.km).toBe(512340);
    expect(data.due[0]).toMatchObject({ km_remaining: -2340, days_remaining: null, status: 'overdue' });
    expect(data.due[1]).toMatchObject({ km_remaining: null, category_name_ar: null });
    expect(data.tires[0]?.tire_id).toBeNull();
    expect(data.tires[1]).toMatchObject({ is_spare: true, total_km: 8200, depth: 'under', section: null });
  });
});

describe('maintTiresPageSchema', () => {
  it('reads rows, unknown statuses and the status counts', () => {
    const page = maintTiresPageSchema.parse({
      rows: [
        {
          id: 't1',
          brand: 'Michelin',
          model: 'X Multi',
          size: '315/80R22.5',
          dot_code: '2325',
          status: 'mounted',
          origin: 'shipment',
          total_km: 15000,
          retread_count: 0,
          vehicle_id: 7,
          plate: 'أ ب ج 1234',
          position_code: 'T1L',
          mounted_at: '2026-06-01T08:00:00Z',
        },
        { id: 't2', status: 'quarantined', vehicle_id: null, plate: null },
      ],
      total: 2,
      status_counts: { mounted: 1, quarantined: 1 },
    });
    expect(page.rows[1]).toMatchObject({ status: 'quarantined', brand: null, total_km: null });
    expect(page.status_counts).toEqual({ mounted: 1, quarantined: 1 });
    expect(maintTiresPageSchema.parse({ rows: [] }).status_counts).toEqual({});
  });
});
