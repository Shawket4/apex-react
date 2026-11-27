import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { attendanceMonthSchema } from '@/entities/maintenance/schemas';
import { fmtMinutes, kindCode, shiftMonth } from './lib';

const t = ((key: string, vars?: Record<string, unknown>) =>
  `${key}${vars ? JSON.stringify(vars) : ''}`) as unknown as TFunction;

describe('garage attendance', () => {
  it('moves months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });

  it('writes durations without zero parts', () => {
    expect(fmtMinutes(45, t)).toBe('attendance.duration.m{"m":45}');
    expect(fmtMinutes(120, t)).toBe('attendance.duration.h{"h":2}');
    expect(fmtMinutes(135, t)).toBe('attendance.duration.hm{"h":2,"m":15}');
    expect(fmtMinutes(null, t)).toBe('—');
  });

  it('shows no code for days outside the list or not come yet', () => {
    expect(kindCode('outside', t)).toBe('');
    expect(kindCode('future', t)).toBe('');
    expect(kindCode('late', t)).toBe('attendance.code.late');
  });

  it('reads a month leniently: missing totals and nulls become zeros and dashes', () => {
    const m = attendanceMonthSchema.parse({
      month: '2026-11',
      first: '2026-11-01',
      last: '2026-11-30',
      today: '2026-11-27',
      settings: {
        work_start: '08:00',
        work_end: '17:00',
        late_grace_minutes: 15,
        weekly_off_days: [5],
        saved: true,
      },
      days: [
        {
          date: '2026-11-01',
          day: 1,
          weekday: 7,
          is_weekly_off: false,
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
              kind: 'late',
              check_in_at: '2026-11-01T06:30:00Z',
              check_out_at: null,
              note: null,
              late_minutes: 30,
              worked_minutes: null,
              marked_by: null,
            },
          ],
          totals: { present: 1, late: 1 },
        },
      ],
      totals: {},
    });
    expect(m.workers[0].totals).toMatchObject({
      present: 1,
      late: 1,
      absent: 0,
      worked_minutes: 0,
    });
    expect(m.totals.present).toBe(0);
    expect(m.workers[0].cells[0].worked_minutes).toBeNull();
  });
});
