import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { attendanceMonthSchema } from '@/entities/maintenance/schemas';
import { kindCode, shiftMonth } from './lib';

const t = ((key: string, vars?: Record<string, unknown>) =>
  `${key}${vars ? JSON.stringify(vars) : ''}`) as unknown as TFunction;

describe('garage attendance', () => {
  it('moves months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });

  it('shows no code for days outside the list or not come yet', () => {
    expect(kindCode('outside', t)).toBe('');
    expect(kindCode('future', t)).toBe('');
    expect(kindCode('present', t)).toBe('attendance.code.present');
    expect(kindCode('late', t)).toBe('');
    expect(kindCode('off', t)).toBe('');
  });

  it('reads a month leniently: missing totals and nulls become zeros and dashes', () => {
    const m = attendanceMonthSchema.parse({
      month: '2026-11',
      first: '2026-11-01',
      last: '2026-11-30',
      today: '2026-11-27',
      days: [
        {
          date: '2026-11-01',
          day: 1,
          weekday: 7,
          is_today: false,
          is_future: false,
        },
      ],
      workers: [
        {
          worker_id: 'w1',
          name: 'Worker',
          job: null,
          cells: [
            {
              kind: 'present',
              check_in_at: '2026-11-01T06:30:00Z',
              check_out_at: null,
              note: null,
              marked_by: null,
            },
          ],
          totals: { present: 1 },
        },
      ],
      totals: {},
    });
    expect(m.workers[0].totals).toMatchObject({
      present: 1,
      absent: 0,
      unmarked: 0,
    });
    expect(m.totals.present).toBe(0);
    expect(m.workers[0].cells[0].check_out_at).toBeNull();
  });
});
