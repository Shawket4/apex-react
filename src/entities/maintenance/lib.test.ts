import { describe, expect, it } from 'vitest';
import ar from '@/shared/i18n/locales/ar.json';
import en from '@/shared/i18n/locales/en.json';
import { deriveMaintBaseURL } from '@/shared/api/maint-base';
import {
  dueRemaining,
  dueTone,
  groupTirePositions,
  localName,
  pageCount,
  tireStatusTabs,
  totalOf,
  wheelLabel,
  workOrderSummary,
  type Translate,
} from './lib';
import { tirePositionSchema, workOrderDetailSchema, workOrdersPageSchema } from './schemas';

describe('deriveMaintBaseURL', () => {
  it('uses the explicit base when there is one', () => {
    expect(deriveMaintBaseURL('https://garage.example/api/maint/', 'https://x.example/api/go')).toBe(
      'https://garage.example/api/maint',
    );
  });

  it('swaps a trailing /api/go for /api/maint', () => {
    expect(deriveMaintBaseURL(undefined, 'https://fleet.example/api/go')).toBe(
      'https://fleet.example/api/maint',
    );
    expect(deriveMaintBaseURL('', 'https://fleet.example/api/go/')).toBe(
      'https://fleet.example/api/maint',
    );
  });

  it('gives null when the Go base does not end in /api/go', () => {
    expect(deriveMaintBaseURL(undefined, 'https://fleet.example:3001')).toBeNull();
    expect(deriveMaintBaseURL(undefined, 'https://fleet.example/api/go/v2')).toBeNull();
    expect(deriveMaintBaseURL(undefined, 'https://fleet.example/api/gopher')).toBeNull();
    expect(deriveMaintBaseURL(undefined, undefined)).toBeNull();
  });
});

describe('dueTone', () => {
  it('never paints an unsure status green', () => {
    expect(dueTone('overdue')).toBe('destructive');
    expect(dueTone('never_done')).toBe('warning');
    expect(dueTone('due_soon')).toBe('warning');
    expect(dueTone('unknown')).toBe('warning');
    expect(dueTone('ok')).toBe('success');
    expect(dueTone('something_new')).toBe('secondary');
  });
});

describe('dueRemaining', () => {
  it('reads a negative figure as late by that much', () => {
    expect(dueRemaining({ km_remaining: -1200.4, days_remaining: 12 })).toEqual({
      km: { late: true, amount: 1200 },
      days: { late: false, amount: 12 },
    });
  });

  it('keeps an unknown side null and zero on time', () => {
    expect(dueRemaining({ km_remaining: null, days_remaining: 0 })).toEqual({
      km: null,
      days: { late: false, amount: 0 },
    });
  });
});

describe('groupTirePositions', () => {
  const position = (over: Record<string, unknown>) =>
    tirePositionSchema.parse({ position_id: String(over.position_code), ...over });

  it('splits tractor, trailer and spares and keeps the server order', () => {
    const groups = groupTirePositions([
      position({ position_code: 'T1L', section: 'tractor' }),
      position({ position_code: 'T1R', section: 'tractor' }),
      position({ position_code: 'R1L', section: 'trailer' }),
      position({ position_code: 'X', section: null }),
      position({ position_code: 'S1', is_spare: true, section: null }),
    ]);
    expect(groups.tractor.map((p) => p.position_code)).toEqual(['T1L', 'T1R']);
    expect(groups.trailer.map((p) => p.position_code)).toEqual(['R1L']);
    expect(groups.spares.map((p) => p.position_code)).toEqual(['S1']);
    expect(groups.other.map((p) => p.position_code)).toEqual(['X']);
  });
});

describe('tire status tabs', () => {
  it('lists known statuses first and keeps ones it has never heard of', () => {
    expect(tireStatusTabs({ mounted: 3, quarantined: 1 })).toEqual([
      'mounted',
      'in_stock_used',
      'in_repair',
      'retreading',
      'scrapped',
      'quarantined',
    ]);
    expect(totalOf({ mounted: 3, quarantined: 1 })).toBe(4);
    expect(totalOf({})).toBe(0);
  });
});

describe('pageCount', () => {
  it('is at least one page', () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(21, 20)).toBe(2);
    expect(pageCount(5, 0)).toBe(1);
  });
});

describe('localName', () => {
  it('prefers the reader language and falls back to the other', () => {
    expect(localName('غيار زيت', 'Oil service', 'ar')).toBe('غيار زيت');
    expect(localName('غيار زيت', 'Oil service', 'en')).toBe('Oil service');
    expect(localName('غيار زيت', null, 'en')).toBe('غيار زيت');
    expect(localName(' ', undefined, 'ar')).toBeNull();
  });
});

/* ----------------------------- Wheel positions ----------------------------- */

/** The real locale files, read the way i18next reads them. */
function translator(locale: Record<string, unknown>): Translate {
  return (key, vars = {}) => {
    const found = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);
    if (typeof found !== 'string') throw new Error(`missing translation: ${key}`);
    return found.replace(/\{\{(\w+)\}\}/g, (_, name: string) => vars[name] ?? `{{${name}}}`);
  };
}

function wheel(fields: Record<string, unknown>) {
  return tirePositionSchema.parse({ position_id: 'p', ...fields });
}

describe('wheelLabel', () => {
  const inEnglish = (fields: Record<string, unknown>) =>
    wheelLabel(wheel(fields), translator(en), 'en');
  const inArabic = (fields: Record<string, unknown>) =>
    wheelLabel(wheel(fields), translator(ar), 'ar');

  const front = { section: 'tractor', axle_index: 1, is_steering: true, side: 'left', depth: 'single' };
  const drive = { section: 'tractor', axle_index: 2, is_steering: false, side: 'right', depth: 'inner' };
  const trailer = { section: 'trailer', axle_index: 1, is_steering: false, side: 'left', depth: 'outer' };
  const spare = { is_spare: true, spare_index: 1 };

  it('names positions in English', () => {
    expect(inEnglish(front)).toBe('Front left');
    expect(inEnglish({ ...front, side: 'right' })).toBe('Front right');
    expect(inEnglish(drive)).toBe('Tractor axle 2 · right inner');
    expect(inEnglish(trailer)).toBe('Trailer axle 1 · left outer');
    expect(inEnglish(spare)).toBe('Spare 1');
  });

  it('names positions in Arabic, with Arabic figures', () => {
    expect(inArabic(front)).toBe('قدام شمال');
    expect(inArabic(drive)).toBe('محور ٢ في الجرار · يمين جوّه');
    expect(inArabic(trailer)).toBe('محور ١ في المقطورة · شمال برّه');
    expect(inArabic(spare)).toBe('استبن ١');
  });

  it('leaves "single" unsaid: a single wheel is just its side', () => {
    expect(inEnglish({ section: 'trailer', axle_index: 3, side: 'right', depth: 'single' })).toBe(
      'Trailer axle 3 · right',
    );
  });

  it('names a second steering axle by its number', () => {
    expect(inEnglish({ ...front, axle_index: 2 })).toBe('Tractor axle 2 · left');
  });

  it('says only what the server sent', () => {
    expect(inEnglish({ is_steering: true })).toBe('Front');
    expect(inEnglish({ axle_index: 2, side: 'left', depth: 'outer' })).toBe('Axle 2 · left outer');
    expect(inEnglish({ section: 'trailer', side: 'left' })).toBe('Trailer · left');
    expect(inEnglish({ is_spare: true })).toBe('Spare');
    // A spare is a spare wherever the layout hangs it.
    expect(inEnglish({ ...drive, is_spare: true, spare_index: 2 })).toBe('Spare 2');
  });

  it('skips values this build has never heard of, and gives null for nothing', () => {
    expect(inEnglish({ section: 'dolly', axle_index: 1, side: 'middle', depth: 'triple' })).toBe(
      'Axle 1',
    );
    expect(inEnglish({ position_code: 'T1L' })).toBeNull();
    expect(inEnglish({ axle_index: 0 })).toBeNull();
  });
});

describe('workOrderSummary', () => {
  const row = { summary: 'تغيير زيت، فلتر', summary_en: 'Oil change, Filter' };

  it('reads in the reader\'s language', () => {
    expect(workOrderSummary(row, 'en')).toBe('Oil change, Filter');
    expect(workOrderSummary(row, 'ar')).toBe('تغيير زيت، فلتر');
  });

  it('falls back to the Arabic when there is no English', () => {
    expect(workOrderSummary({ ...row, summary_en: null }, 'en')).toBe('تغيير زيت، فلتر');
    expect(workOrderSummary({ summary: null, summary_en: null }, 'en')).toBeNull();
  });
});

describe('new work-order fields', () => {
  it('reads who opened, counts and who did a task; absent is null or empty', () => {
    const page = workOrdersPageSchema.parse({
      rows: [{ id: 'w1', status: 'open', opened_by: 'Ahmed', summary_en: 'Oil change' }, { id: 'w2', status: 'closed' }],
      status_counts: { open: 3, closed: '9' },
    });
    expect(page.rows[0]).toMatchObject({ opened_by: 'Ahmed', summary_en: 'Oil change' });
    expect(page.rows[1]).toMatchObject({ opened_by: null, summary_en: null });
    expect(page.status_counts).toEqual({ open: 3, closed: 9 });
    expect(workOrdersPageSchema.parse({ rows: [] }).status_counts).toEqual({});

    const detail = workOrderDetailSchema.parse({
      work_order: { id: 'w1', status: 'open' },
      tasks: [{ id: 't1', description: 'زيت', description_en: 'Oil', is_done: true, done_by: 'Mona' }, { id: 't2' }],
    });
    expect(detail.tasks[0]).toMatchObject({ description_en: 'Oil', done_by: 'Mona' });
    expect(detail.tasks[1]).toMatchObject({ description_en: null, done_by: null });
  });
});
