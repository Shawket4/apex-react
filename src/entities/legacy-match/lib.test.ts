import { describe, expect, it } from 'vitest';
import { applyDecision, searchWordings, waitingLines } from './lib';
import { importResultSchema, maintCategoriesSchema, unmatchedPageSchema } from './schemas';

const page = unmatchedPageSchema.parse({
  rows: [
    { norm_text: 'تغيير زيت', text: 'تغيير زيت ', lines: 40, vehicles: 12, last_at: '2026-01-05T10:00:00Z' },
    { norm_text: 'غسيل', text: 'غسيل', lines: 7, vehicles: 5, last_at: null },
    { norm_text: 'فلتر هواء', text: 'فلتر هوا', lines: 3, vehicles: 3 },
  ],
  stats: { lines: 100, recognised: 30, ignored: 20 },
});

describe('unmatchedPageSchema', () => {
  it('reads the server shape', () => {
    expect(page.rows).toHaveLength(3);
    expect(page.rows[2]!.last_at).toBeNull();
    expect(page.stats).toMatchObject({ lines: 100, recognised: 30, ignored: 20 });
  });

  it('survives missing parts', () => {
    const empty = unmatchedPageSchema.parse({});
    expect(empty.rows).toEqual([]);
    expect(empty.stats).toEqual({ lines: 0, recognised: 0, ignored: 0 });
    expect(unmatchedPageSchema.parse({ rows: [{ norm_text: 'x', lines: '4' }] }).rows[0]).toMatchObject(
      { text: null, lines: 4, vehicles: 0, last_at: null },
    );
  });
});

describe('other shapes', () => {
  it('reads an import result and categories leniently', () => {
    expect(importResultSchema.parse({ lines: 9, recognised: 5, unrecognised: 4 })).toMatchObject({
      lines: 9,
      removed: 0,
    });
    expect(maintCategoriesSchema.parse([{ id: 'oil', name_ar: 'زيت', extra: 1 }])[0]).toMatchObject({
      id: 'oil',
      name_en: null,
    });
    expect(maintCategoriesSchema.parse(null)).toEqual([]);
  });
});

describe('waitingLines', () => {
  it('is what is neither recognised nor ignored, never negative', () => {
    expect(waitingLines(page.stats)).toBe(50);
    expect(waitingLines({ lines: 1, recognised: 2, ignored: 3 })).toBe(0);
  });
});

describe('applyDecision', () => {
  it('moves a matched wording to recognised', () => {
    const next = applyDecision(page, 'تغيير زيت', 'oil_change');
    expect(next.rows.map((row) => row.norm_text)).toEqual(['غسيل', 'فلتر هواء']);
    expect(next.stats).toMatchObject({ recognised: 70, ignored: 20 });
  });

  it('moves an ignored wording to ignored', () => {
    const next = applyDecision(page, 'غسيل', null);
    expect(next.rows).toHaveLength(2);
    expect(next.stats).toMatchObject({ recognised: 30, ignored: 27 });
  });

  it('leaves the page alone for a wording that is not listed', () => {
    expect(applyDecision(page, 'nope', null)).toBe(page);
    expect(page.rows).toHaveLength(3);
  });
});

describe('searchWordings', () => {
  it('returns everything for an empty search', () => {
    expect(searchWordings(page.rows, '  ')).toBe(page.rows);
  });

  it('finds every word in any order', () => {
    expect(searchWordings(page.rows, 'زيت تغيير').map((row) => row.norm_text)).toEqual(['تغيير زيت']);
    expect(searchWordings(page.rows, 'زيت فلتر')).toEqual([]);
  });

  it('searches both the typed and the normalised wording, folding spelling', () => {
    expect(searchWordings(page.rows, 'هواء')).toHaveLength(1);
    expect(searchWordings(page.rows, 'هوا')).toHaveLength(1);
    expect(
      searchWordings([{ norm_text: 'x', text: 'صيانة إطارات', lines: 1, vehicles: 1, last_at: null }], 'صيانه اطارات'),
    ).toHaveLength(1);
  });
});
