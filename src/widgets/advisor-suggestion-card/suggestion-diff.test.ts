import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_VALUE,
  describeResult,
  formatDiffValue,
  humanizeField,
  suggestionDiffRows,
} from './suggestion-diff';
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
});

describe('formatting', () => {
  it('formats scalars, blanks and objects', () => {
    expect(formatDiffValue(undefined)).toBe(EMPTY_VALUE);
    expect(formatDiffValue('')).toBe(EMPTY_VALUE);
    expect(formatDiffValue(false)).toBe('false');
    expect(formatDiffValue(0)).toBe('0');
    expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
  });

  it('humanizes snake_case field names', () => {
    expect(humanizeField('driver_name')).toBe('Driver name');
    expect(humanizeField('car')).toBe('Car');
  });

  it("reads FalconGo's error or message out of a result", () => {
    expect(describeResult({ error: 'car is on a trip' })).toBe('car is on a trip');
    expect(describeResult({ message: 'ok' })).toBe('ok');
    expect(describeResult(null)).toBeNull();
    expect(describeResult({ id: 3 })).toBe('{"id":3}');
  });
});

describe('<SuggestionDiffTable>', () => {
  const labels = { field: 'Field', before: 'Before', after: 'After' };
  const render = (props: Partial<Parameters<typeof SuggestionDiffTable>[0]> = {}) =>
    renderToStaticMarkup(createElement(SuggestionDiffTable, { before, after, labels, ...props }));

  it('renders one row per field with before and after values', () => {
    const html = render();
    expect(html.split('<tbody>')[1].match(/<tr /g)).toHaveLength(4);
    expect(html).toContain('>Ahmed</td>');
    expect(html).toContain('>Mahmoud</td>');
    expect(html).toContain('>Driver name</th>');
    expect(html).toContain('>Before</th>');
  });

  it('marks only the changed rows', () => {
    const html = render();
    expect(html.match(/data-changed="true"/g)).toHaveLength(2);
  });

  it('keeps Arabic values direction-neutral', () => {
    expect(render()).toContain('<td dir="auto" class="px-2 py-1.5">ن ج ب 1234</td>');
  });

  it('uses the caller’s field labels', () => {
    expect(render({ fieldLabel: (f) => `#${f}` })).toContain('>#driver_name</th>');
  });

  it('renders nothing for an empty change', () => {
    expect(render({ before: {}, after: {} })).toBe('');
  });
});
