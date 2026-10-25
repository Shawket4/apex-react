import { describe, expect, it } from 'vitest';
import {
  describeMappingFee,
  KNOWN_COMPANY_METHODS,
  methodsFromRules,
  tripMoneyCell,
} from './masking';
import type { PricingCompany } from './schemas';

describe('describeMappingFee', () => {
  it('shows nothing below permission 3, whatever the company', () => {
    for (const level of [0, 1, 2]) {
      expect(describeMappingFee(level, 'band_per_1000l', 5)).toBeNull();
      expect(describeMappingFee(level, 'per_1000l_fee', 117.5)).toBeNull();
      expect(describeMappingFee(level, 'per_km', 300)).toBeNull();
    }
  });

  it('reads a Watanya fee as a band and a Petrol Arrows fee as a rate', () => {
    expect(describeMappingFee(3, KNOWN_COMPANY_METHODS.Watanya, 5)).toEqual({ kind: 'band', band: 5 });
    expect(describeMappingFee(4, KNOWN_COMPANY_METHODS['Petrol Arrows'], '117.5')).toEqual({
      kind: 'rate',
      ratePer1000L: 117.5,
    });
  });

  it('shows nothing for per-km companies, unknown companies, or no fee', () => {
    expect(describeMappingFee(4, KNOWN_COMPANY_METHODS.TAQA, 300)).toBeNull();
    expect(describeMappingFee(4, KNOWN_COMPANY_METHODS.Petromin, 300)).toBeNull();
    expect(describeMappingFee(4, undefined, 5)).toBeNull();
    expect(describeMappingFee(4, 'band_per_1000l', 0)).toBeNull();
    expect(describeMappingFee(4, 'band_per_1000l', null)).toBeNull();
    expect(describeMappingFee(4, 'band_per_1000l', 'abc')).toBeNull();
  });
});

describe('tripMoneyCell', () => {
  it('is empty below permission 4, even when a figure arrived', () => {
    expect(tripMoneyCell(1, 7315)).toBeNull();
    expect(tripMoneyCell(2, 7315)).toBeNull();
    expect(tripMoneyCell(3, 7315)).toBeNull();
  });
  it('is the revenue at 4, and empty when the server sent none', () => {
    expect(tripMoneyCell(4, 7315)).toBe(7315);
    expect(tripMoneyCell(4, 0)).toBe(0);
    expect(tripMoneyCell(4, undefined)).toBeNull();
    expect(tripMoneyCell(4, null)).toBeNull();
  });
});

describe('methodsFromRules', () => {
  const company = (name: string, method: 'per_km' | 'band_per_1000l', current: number): PricingCompany => ({
    company: name,
    current_rule_id: current,
    rules: [
      { id: 2, company: name, effective_from: '2027-01-01', method: 'per_km', vat_rate: 0.14, rental_mode: 'none', bands: [] },
      { id: 1, company: name, effective_from: '2000-01-01', method, vat_rate: 0.14, rental_mode: 'none', bands: [] },
    ],
  });

  it('uses the version in force, not a scheduled one', () => {
    expect(methodsFromRules([company('Watanya', 'band_per_1000l', 1)]).Watanya).toBe('band_per_1000l');
  });
  it('adds companies the seed does not know and keeps the seed for the rest', () => {
    const m = methodsFromRules([company('NewCo', 'band_per_1000l', 1)]);
    expect(m.NewCo).toBe('band_per_1000l');
    expect(m.TAQA).toBe('per_km');
  });
  it('falls back to the seed before the rules load', () => {
    expect(methodsFromRules(undefined)).toEqual(KNOWN_COMPANY_METHODS);
  });
});
