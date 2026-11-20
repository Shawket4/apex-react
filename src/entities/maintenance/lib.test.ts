import { describe, expect, it } from 'vitest';
import { deriveMaintBaseURL } from '@/shared/api/maint-base';
import {
  dueRemaining,
  dueTone,
  groupTirePositions,
  localName,
  pageCount,
  tireStatusTabs,
  totalOf,
} from './lib';
import { tirePositionSchema } from './schemas';

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
