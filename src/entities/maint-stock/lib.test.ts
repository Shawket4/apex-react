import { describe, expect, it } from 'vitest';
import { attemptFor, countChange, parseCounted } from './lib';
import {
  batteryCountResultSchema,
  batteryCreditInputSchema,
  batteryStockSchema,
  oilCountResultSchema,
  tireCountResultSchema,
} from './schemas';

describe('parseCounted', () => {
  it('takes whole tires from 0 up', () => {
    expect(parseCounted('0', 'tires')).toBe(0);
    expect(parseCounted(' 12 ', 'tires')).toBe(12);
    expect(parseCounted('100000', 'tires')).toBe(100000);
    expect(parseCounted('١٢', 'tires')).toBe(12);
    expect(parseCounted('١٨٠٫٥', 'oil')).toBe(180.5);
  });

  it('refuses what is not a tire count', () => {
    for (const raw of ['', ' ', '-1', '2.5', 'abc', '1e3', '100001', '1 2']) {
      expect(parseCounted(raw, 'tires')).toBeNull();
    }
  });

  it('takes whole batteries, as tires', () => {
    expect(parseCounted('7', 'batteries')).toBe(7);
    expect(parseCounted('٣', 'batteries')).toBe(3);
    expect(parseCounted('2.5', 'batteries')).toBeNull();
    expect(parseCounted('100001', 'batteries')).toBeNull();
  });

  it('takes liters to two places, with a dot or a comma', () => {
    expect(parseCounted('180.5', 'oil')).toBe(180.5);
    expect(parseCounted('180,25', 'oil')).toBe(180.25);
    expect(parseCounted('0.126', 'oil')).toBe(0.13);
    expect(parseCounted('-3', 'oil')).toBeNull();
    expect(parseCounted('1000001', 'oil')).toBeNull();
  });
});

describe('countChange', () => {
  it('says what a count does to the book', () => {
    expect(countChange(12, 10)).toEqual({ direction: 'remove', amount: 2 });
    expect(countChange(10, 12)).toEqual({ direction: 'add', amount: 2 });
    expect(countChange(12, 12)).toEqual({ direction: 'same', amount: 0 });
  });

  it('does not invent a difference out of float noise', () => {
    expect(countChange(0.1 + 0.2, 0.3)).toEqual({ direction: 'same', amount: 0 });
    expect(countChange(180.5, 179.75)).toEqual({ direction: 'remove', amount: 0.75 });
  });
});

describe('attemptFor', () => {
  it('reuses the reference for the same submission and renews it for another', () => {
    let n = 0;
    const makeId = () => `id-${++n}`;
    const first = attemptFor(null, '10|', makeId);
    expect(first.refId).toBe('id-1');
    expect(attemptFor(first, '10|', makeId)).toBe(first);
    expect(attemptFor(first, '9|', makeId).refId).toBe('id-2');
  });
});

describe('count results', () => {
  it('reads the tire answer', () => {
    expect(
      tireCountResultSchema.parse({ brand: 'Michelin', model: '', size: '315/80R22.5', before: 12, on_hand_qty: 10, change: -2 }),
    ).toMatchObject({ before: 12, on_hand_qty: 10, change: -2 });
  });

  it('reads the oil answer, decimal strings included, and survives gaps', () => {
    expect(oilCountResultSchema.parse({ oil_type: '15W-40', before: '180.50', liters_on_hand: 179.75, change: -0.75 })).toMatchObject({
      before: 180.5,
      liters_on_hand: 179.75,
      change: -0.75,
    });
    expect(oilCountResultSchema.parse({})).toMatchObject({ before: null, liters_on_hand: null, change: null });
  });
});

describe('batteries', () => {
  it('reads a stock line; a model of "" is no model', () => {
    expect(
      batteryStockSchema.parse({
        id: 'p1',
        brand: 'Varta',
        model: '',
        capacity_ah: 180,
        voltage: 12,
        cca: null,
        on_hand_qty: 4,
        batteries: 6,
      }),
    ).toMatchObject({ model: null, capacity_ah: 180, cca: null, on_hand_qty: 4, batteries: 6 });
    expect(batteryStockSchema.parse({ brand: 'Bosch', on_hand_qty: '2' })).toMatchObject({
      id: null,
      capacity_ah: null,
      voltage: null,
      on_hand_qty: 2,
      batteries: 0,
    });
  });

  it('reads the count answer', () => {
    expect(
      batteryCountResultSchema.parse({ brand: 'Varta', model: 'Blue', capacity_ah: 100, voltage: 12, before: 5, on_hand_qty: 3, change: -2 }),
    ).toMatchObject({ before: 5, on_hand_qty: 3, change: -2 });
  });

  it('takes a shipment with empty optional numbers as null', () => {
    expect(
      batteryCreditInputSchema.parse({ brand: ' Varta ', model: '', capacity_ah: '', voltage: '12', cca: null, qty: '4' }),
    ).toEqual({ brand: 'Varta', model: '', capacity_ah: null, voltage: 12, cca: null, qty: 4 });
    expect(
      batteryCreditInputSchema.parse({ brand: 'Varta', model: 'Blue', capacity_ah: '100', voltage: NaN, cca: '800', qty: 1 }),
    ).toMatchObject({ capacity_ah: 100, voltage: null, cca: 800 });
  });

  it('refuses what the garage system would refuse', () => {
    const base = { brand: 'Varta', model: '', capacity_ah: '', voltage: '', cca: '', qty: '1' };
    expect(batteryCreditInputSchema.safeParse({ ...base, brand: ' ' }).success).toBe(false);
    expect(batteryCreditInputSchema.safeParse({ ...base, qty: '0' }).success).toBe(false);
    expect(batteryCreditInputSchema.safeParse({ ...base, qty: '10001' }).success).toBe(false);
    expect(batteryCreditInputSchema.safeParse({ ...base, capacity_ah: '2001' }).success).toBe(false);
    expect(batteryCreditInputSchema.safeParse({ ...base, voltage: '1' }).success).toBe(false);
    expect(batteryCreditInputSchema.safeParse({ ...base, cca: '12.5' }).success).toBe(false);
  });
});
