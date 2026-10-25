import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_VALUE,
  MAINT_CATEGORIES,
  describeResult,
  formatDiffValue,
  humanizeField,
  isSuccessStatus,
  makeValueFormatter,
  readableReason,
  resetReason,
  suggestionDiffRows,
} from './suggestion-diff';
import en from '@/shared/i18n/locales/en.json';
import ar from '@/shared/i18n/locales/ar.json';
import { SuggestionDiffTable } from './suggestion-diff-table';

const before = { plate_number: 'ن ج ب 1234', driver_name: 'Ahmed', car_id: 12 };
const after = { plate_number: 'ن ج ب 1234', driver_name: 'Mahmoud', car_id: 12, note: 'via AI' };

describe('suggestionDiffRows', () => {
  it("lists before's fields in order, then fields only after has, marking what changed", () => {
    expect(suggestionDiffRows(before, after)).toEqual([
      { field: 'plate_number', before: 'ن ج ب 1234', after: 'ن ج ب 1234', changed: false },
      { field: 'driver_name', before: 'Ahmed', after: 'Mahmoud', changed: true },
      { field: 'car_id', before: '12', after: '12', changed: false },
      { field: 'note', before: EMPTY_VALUE, after: 'via AI', changed: true },
    ]);
  });

  it('shows a field that is cleared as a dash after', () => {
    expect(suggestionDiffRows({ driver_id: 7 }, { driver_id: null })).toEqual([
      { field: 'driver_id', before: '7', after: EMPTY_VALUE, changed: true },
    ]);
  });

  it('is empty when neither side names a field', () => {
    expect(suggestionDiffRows({}, {})).toEqual([]);
  });

  it('leaves out a field that is empty on both sides', () => {
    expect(
      suggestionDiffRows({ notes: null, liters: 35 }, { notes: '', liters: 36, extra: undefined }),
    ).toEqual([{ field: 'liters', before: '35', after: '36', changed: true }]);
  });

  it('formats both sides with the given formatter, by field', () => {
    const rows = suggestionDiffRows({ a: 1 }, { a: 2 }, (v, f) => `${f}=${String(v)}`);
    expect(rows).toEqual([{ field: 'a', before: 'a=1', after: 'a=2', changed: true }]);
  });
});

/** A `t` that reads the real locale file, so the tests also prove the keys exist. */
function translator(dict: unknown) {
  return (key: string, fallback: string) => {
    const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict);
    return typeof v === 'string' ? v : fallback;
  };
}

describe('makeValueFormatter', () => {
  const fmtEn = makeValueFormatter(translator(en), 'en');
  const fmtAr = makeValueFormatter(translator(ar), 'ar');

  it('formats timestamps in Cairo time, in the UI language', () => {
    // 07:36Z is 10:36 in Cairo (EEST, +3) on 25 Oct 2026.
    expect(fmtEn('2026-10-25T07:36:00Z', 'performed_at')).toBe('25 Oct 2026 · 10:36');
    const arText = fmtAr('2026-10-25T07:36:00Z', 'performed_at');
    expect(arText).not.toMatch(/Oct/);
    expect(arText).toContain('أكتوبر');
  });

  it('formats a day as a day, without a time or a zone shift', () => {
    expect(fmtEn('2026-10-20', 'date')).toBe('20 Oct 2026');
    expect(fmtEn('2026-10-20T00:00:00Z', 'violation_date')).toBe('20 Oct 2026');
    expect(fmtEn('2026-10-20', 'anything')).toBe('20 Oct 2026');
  });

  it('names maintenance categories in the tasks list', () => {
    expect(fmtEn('oil_change, air_filter', 'tasks')).toBe('Oil change, Air filter');
    expect(fmtAr('oil_change, air_filter', 'tasks')).toBe('تغيير زيت، فلتر الهواء');
    expect(fmtEn(['brakes', 'tires'], 'categories')).toBe('Brakes, Tires');
    expect(fmtEn('greasing', 'category_id')).toBe('Greasing');
    // A service's default title is its categories; a written title stays as written.
    expect(fmtEn('oil_change, air_filter', 'title')).toBe('Oil change, Air filter');
    expect(fmtEn('Oil change at Obour', 'title')).toBe('Oil change at Obour');
  });

  it('has a label for every maintenance category in both languages', () => {
    for (const c of MAINT_CATEGORIES) {
      expect(en.advisor.suggestion.categories).toHaveProperty(c);
      expect(ar.advisor.suggestion.categories).toHaveProperty(c);
    }
  });

  it('says Yes / No and in / out in the UI language', () => {
    expect(fmtEn(true, 'is_paid')).toBe('Yes');
    expect(fmtAr(false, 'is_paid')).toBe('لا');
    expect(fmtEn('out', 'direction')).toBe('Out (paid)');
    expect(fmtAr('in', 'direction')).toBe('وارد');
    // Only the direction field reads in/out that way.
    expect(fmtEn('out', 'status')).toBe('out');
  });

  it('leaves everything else alone', () => {
    expect(fmtEn('ن ج ب 1234', 'plate_number')).toBe('ن ج ب 1234');
    expect(fmtEn(35.5, 'liters')).toBe('35.5');
    expect(fmtEn(null, 'notes')).toBe(EMPTY_VALUE);
    expect(fmtEn('not a date 2026', 'date')).toBe('not a date 2026');
  });
});

describe('field labels', () => {
  // Every field a suggestion can carry (apex-rust's catalogs, maint payloads, labels).
  const FIELDS = [
    'car_no_plate', 'plate_number', 'name', 'driver_name', 'date', 'company', 'receipt_no',
    'tasks', 'containers', 'inspection_items', 'operations', 'superseded_km', 'set_at',
    'notes_en', 'notes_ar', 'performed_at', 'opened_at', 'closed_at', 'odometer_at_open',
    'vehicle_id', 'category_id', 'liters', 'oil_type', 'odometer', 'odometer_before',
    'odometer_after', 'price_per_liter', 'operating_company', 'operating_area', 'description',
    'amount', 'direction', 'occurred_at', 'category', 'counterparty', 'terminal_id',
    'drop_off_point', 'tank_capacity', 'gas_type', 'revenue', 'mileage',
  ];

  it('labels every field in English and Arabic', () => {
    for (const f of FIELDS) {
      expect(en.advisor.suggestion.fields, f).toHaveProperty(f);
      expect(ar.advisor.suggestion.fields, f).toHaveProperty(f);
    }
    expect(Object.keys(ar.advisor.suggestion.fields).sort()).toEqual(
      Object.keys(en.advisor.suggestion.fields).sort(),
    );
  });

  it('labels both note columns as Notes', () => {
    expect(en.advisor.suggestion.fields.notes_en).toBe('Notes');
    expect(en.advisor.suggestion.fields.notes_ar).toBe('Notes');
    expect(en.advisor.suggestion.fields.vehicle_id).toBe('Truck');
  });
});

describe('formatting', () => {
  it('formats scalars, blanks, lists and objects', () => {
    expect(formatDiffValue(undefined)).toBe(EMPTY_VALUE);
    expect(formatDiffValue('')).toBe(EMPTY_VALUE);
    expect(formatDiffValue(false)).toBe('false');
    expect(formatDiffValue(0)).toBe('0');
    expect(formatDiffValue(['a', 'b'])).toBe('a, b');
    expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
  });

  it('humanizes snake_case field names', () => {
    expect(humanizeField('driver_name')).toBe('Driver name');
    expect(humanizeField('car')).toBe('Car');
  });

});

describe('describeResult', () => {
  const GENERIC = 'The system refused the change.';

  it('says nothing more for an applied change, whatever the record holds', () => {
    expect(describeResult({ id: 3, car_no_plate: 'x', updated_at: '…' }, 'applied', GENERIC)).toBeNull();
    expect(describeResult('ok', 'applied', GENERIC)).toBeNull();
    expect(describeResult({ error: 'x' }, 'pending', GENERIC)).toBeNull();
  });

  it('prefers error, then detail, then message, then title', () => {
    expect(
      describeResult({ title: 'T', message: 'M', detail: 'D', error: 'E' }, 'failed', GENERIC),
    ).toBe('E');
    expect(describeResult({ title: 'T', message: 'M', detail: 'D' }, 'failed', GENERIC)).toBe('D');
    expect(describeResult({ title: 'T', message: 'M' }, 'failed', GENERIC)).toBe('M');
    expect(describeResult({ title: 'Conflict' }, 'failed', GENERIC)).toBe('Conflict');
  });

  it("reads apex-rust's problem+json detail", () => {
    const problem = {
      type: 'about:blank#version-conflict',
      title: 'Conflict',
      status: 409,
      detail: 'version conflict: expected 1, found 3',
      expected_version: 1,
      actual_version: 3,
    };
    expect(describeResult(problem, 'failed', GENERIC)).toBe('version conflict: expected 1, found 3');
  });

  it("reads maint-rust's conflict body by its error, not its response", () => {
    const body = {
      error: 'the record changed in maint-rust after this was proposed; nothing was applied',
      response: { results: [{ status: 'conflict', entity_id: 'abc' }] },
    };
    expect(describeResult(body, 'failed', GENERIC)).toBe(body.error);
  });

  it('looks inside a wrapped response when the top level says nothing', () => {
    expect(describeResult({ response: { message: 'car is on a trip' } }, 'failed', GENERIC)).toBe(
      'car is on a trip',
    );
  });

  it('never dumps an object; falls back to the generic line', () => {
    expect(describeResult({ id: 3, rows: [1, 2] }, 'failed', GENERIC)).toBe(GENERIC);
    expect(describeResult(null, 'failed', GENERIC)).toBe(GENERIC);
    expect(describeResult('<html><body>502</body></html>', 'failed', GENERIC)).toBe(GENERIC);
    expect(describeResult({ error: { code: 7 } }, 'failed', GENERIC)).toBe(GENERIC);
  });

  it('reads a plain or JSON-encoded string', () => {
    expect(describeResult('car is on a trip', 'failed', GENERIC)).toBe('car is on a trip');
    expect(describeResult('{"error":"bad plate"}', 'failed', GENERIC)).toBe('bad plate');
  });

  it('clips a very long reason', () => {
    const r = readableReason('x'.repeat(1000));
    expect(r).toHaveLength(300);
    expect(r?.endsWith('…')).toBe(true);
  });
});

describe('reset and status helpers', () => {
  it("reads the reset's reason", () => {
    expect(resetReason({ reset: 'built on trip revenue before it was stored correctly; ask again' })).toBe(
      'built on trip revenue before it was stored correctly; ask again',
    );
    expect(resetReason({ reset: '' })).toBeNull();
    expect(resetReason({ error: 'x' })).toBeNull();
    expect(resetReason(null)).toBeNull();
  });

  it('knows a 2xx', () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(204)).toBe(true);
    expect(isSuccessStatus(409)).toBe(false);
    expect(isSuccessStatus(null)).toBe(false);
  });
});

describe('<SuggestionDiffTable>', () => {
  const labels = { field: 'Field', before: 'Before', after: 'After' };
  const render = (props: Partial<Parameters<typeof SuggestionDiffTable>[0]> = {}) =>
    renderToStaticMarkup(createElement(SuggestionDiffTable, { before, after, labels, ...props }));

  it('renders one row per field with before and after values', () => {
    const html = render();
    expect(html.split('<tbody>')[1].match(/<tr /g)).toHaveLength(4);
    expect(html).toContain('>Ahmed</span></td>');
    expect(html).toContain('>Mahmoud</span></td>');
    expect(html).toContain('>Driver name</th>');
    expect(html).toContain('>Before</th>');
  });

  it('marks only the changed rows', () => {
    const html = render();
    expect(html.match(/data-changed="true"/g)).toHaveLength(2);
  });

  it('keeps Arabic values direction-neutral inside a start-aligned cell', () => {
    expect(render()).toMatch(/<td class="[^"]*text-start[^"]*"><span dir="auto">ن ج ب 1234<\/span><\/td>/);
  });

  it('wraps long values instead of scrolling sideways', () => {
    const html = render();
    expect(html).toContain('table-fixed');
    expect(html).not.toContain('overflow-x-auto');
    expect(html).toContain('[overflow-wrap:anywhere]');
  });

  it('formats values with the caller’s formatter', () => {
    expect(render({ formatValue: (v) => `<${String(v)}>` })).toContain('&lt;Mahmoud&gt;');
  });

  it('uses the caller’s field labels', () => {
    expect(render({ fieldLabel: (f) => `#${f}` })).toContain('>#driver_name</th>');
  });

  it('renders nothing for an empty change', () => {
    expect(render({ before: {}, after: {} })).toBe('');
  });
});
