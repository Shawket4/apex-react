import { describe, expect, it } from 'vitest';
import {
  blankBands,
  defaultEffectiveFrom,
  firstDayOfNextMonth,
  formFromRule,
  hasErrors,
  nextBandNumber,
  parseNumberInput,
  serializeRuleForm,
  validateRuleForm,
  vatFractionToPercent,
  vatPercentToFraction,
  type RuleFormValues,
} from './form';
import type { PricingRule } from './schemas';

const watanya: PricingRule = {
  id: 2,
  company: 'Watanya',
  effective_from: '2000-01-01',
  method: 'band_per_1000l',
  per_km_rate: null,
  vat_rate: 0.14,
  rental_mode: 'none',
  rental_amount: null,
  rental_full_days: null,
  notes: 'seed',
  created_by_user_id: 0,
  created_at: '2026-10-25T08:00:00Z',
  bands: [
    { band: 2, rate_per_1000l: 120.5 },
    { band: 1, rate_per_1000l: 100 },
  ],
};

const taqa: PricingRule = {
  ...watanya,
  id: 3,
  company: 'TAQA',
  method: 'per_km',
  per_km_rate: 50.5,
  rental_mode: 'monthly_taper',
  rental_amount: 43000,
  rental_full_days: 28,
  bands: [],
};

describe('VAT percent ↔ fraction', () => {
  it.each([
    [14, 0.14],
    [0, 0],
    [14.5, 0.145],
    [5, 0.05],
    [99.99, 0.9999],
  ])('%s%% is %s', (percent, fraction) => {
    expect(vatPercentToFraction(percent)).toBe(fraction);
    expect(vatFractionToPercent(fraction)).toBe(percent);
  });

  it('removes float noise both ways', () => {
    expect(vatPercentToFraction(14.1)).toBe(0.141);
    expect(vatFractionToPercent(0.07 + 0.07)).toBe(14);
  });
});

describe('parseNumberInput', () => {
  it('reads what people type', () => {
    expect(parseNumberInput('43,000')).toBe(43000);
    expect(parseNumberInput(' 50.5 ')).toBe(50.5);
    expect(parseNumberInput('١٤')).toBe(14);
    expect(parseNumberInput('٥٠٫٥')).toBe(50.5);
    expect(parseNumberInput('14.')).toBe(14);
  });
  it('refuses what is not a number', () => {
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('abc')).toBeNull();
    expect(parseNumberInput('1.2.3')).toBeNull();
  });
});

describe('effective_from defaults', () => {
  it('rental rules start on the 1st of next month', () => {
    expect(firstDayOfNextMonth('2026-10-25')).toBe('2026-11-01');
    expect(firstDayOfNextMonth('2026-12-31')).toBe('2027-01-01');
    expect(defaultEffectiveFrom('monthly_taper', '2026-10-25')).toBe('2026-11-01');
    expect(defaultEffectiveFrom('per_car_day', '2026-10-01')).toBe('2026-11-01');
  });
  it('rules without rental start tomorrow', () => {
    expect(defaultEffectiveFrom('none', '2026-10-25')).toBe('2026-10-26');
    expect(defaultEffectiveFrom('none', '2026-12-31')).toBe('2027-01-01');
  });
});

describe('formFromRule', () => {
  it('seeds a band rule with its bands in order and VAT as a percentage', () => {
    const f = formFromRule('Watanya', watanya, '2026-10-25');
    expect(f.method).toBe('band_per_1000l');
    expect(f.vat_percent).toBe('14');
    expect(f.bands).toEqual([
      { band: '1', rate: '100' },
      { band: '2', rate: '120.5' },
    ]);
    expect(f.effective_from).toBe('2026-10-26');
    expect(f.notes).toBe('');
  });
  it('seeds a rental rule from next month', () => {
    const f = formFromRule('TAQA', taqa, '2026-10-25');
    expect(f.effective_from).toBe('2026-11-01');
    expect(f.per_km_rate).toBe('50.5');
    expect(f.rental_amount).toBe('43000');
    expect(f.rental_full_days).toBe('28');
  });
  it('starts a blank band table at 15 bands', () => {
    expect(blankBands()).toHaveLength(15);
    expect(blankBands()[14]).toEqual({ band: '15', rate: '' });
  });
});

describe('validateRuleForm', () => {
  const valid = (): RuleFormValues => formFromRule('Watanya', watanya, '2026-10-25');

  it('passes a seeded form', () => {
    expect(hasErrors(validateRuleForm(valid()))).toBe(false);
    expect(hasErrors(validateRuleForm(formFromRule('TAQA', taqa, '2026-10-25')))).toBe(false);
  });

  it('refuses a date the company already has a version on', () => {
    const v = { ...valid(), effective_from: '2000-01-01' };
    expect(validateRuleForm(v, ['2000-01-01']).effective_from).toBe('duplicateDate');
  });

  it('refuses VAT outside [0, 100)', () => {
    expect(validateRuleForm({ ...valid(), vat_percent: '100' }).vat_percent).toBe('vat');
    expect(validateRuleForm({ ...valid(), vat_percent: '-1' }).vat_percent).toBe('vat');
    expect(validateRuleForm({ ...valid(), vat_percent: '' }).vat_percent).toBe('vat');
    expect(validateRuleForm({ ...valid(), vat_percent: '0' }).vat_percent).toBeUndefined();
  });

  it('marks the bad band rows', () => {
    const v = {
      ...valid(),
      bands: [
        { band: '1', rate: '100' },
        { band: '1', rate: '120' },
        { band: '0', rate: '5' },
        { band: '3', rate: '' },
        { band: '4.5', rate: '9' },
      ],
    };
    const e = validateRuleForm(v);
    expect(e.bands).toBe('bandsInvalid');
    expect(e.bandRows).toEqual({ 1: 'bandDuplicate', 2: 'bandNumber', 3: 'bandRate', 4: 'bandNumber' });
  });

  it('needs at least one band, but only for the band method', () => {
    expect(validateRuleForm({ ...valid(), bands: [] }).bands).toBe('bandsRequired');
    expect(validateRuleForm({ ...valid(), method: 'per_1000l_fee', bands: [] }).bands).toBeUndefined();
  });

  it('checks the per-km rate and rental fields by mode', () => {
    const t = formFromRule('TAQA', taqa, '2026-10-25');
    expect(validateRuleForm({ ...t, per_km_rate: '0' }).per_km_rate).toBe('positive');
    expect(validateRuleForm({ ...t, rental_amount: '' }).rental_amount).toBe('positive');
    expect(validateRuleForm({ ...t, rental_full_days: '32' }).rental_full_days).toBe('fullDays');
    expect(validateRuleForm({ ...t, rental_full_days: '27.5' }).rental_full_days).toBe('fullDays');
    // Fields the mode does not use are not checked.
    expect(hasErrors(validateRuleForm({ ...t, rental_mode: 'per_car_day', rental_full_days: '' }))).toBe(false);
    expect(hasErrors(validateRuleForm({ ...t, rental_mode: 'none', rental_amount: '' }))).toBe(false);
  });
});

describe('serializeRuleForm', () => {
  it('sends a band rule with the fraction and sorted bands, and nothing per-km', () => {
    const v = {
      ...formFromRule('Watanya', watanya, '2026-10-25'),
      vat_percent: '14',
      bands: [
        { band: '2', rate: '1,200.5' },
        { band: '1', rate: '100' },
      ],
      per_km_rate: '99',
      notes: '  new contract  ',
    };
    expect(serializeRuleForm(v)).toEqual({
      company: 'Watanya',
      effective_from: '2026-10-26',
      method: 'band_per_1000l',
      vat_rate: 0.14,
      rental_mode: 'none',
      bands: [
        { band: 1, rate_per_1000l: 100 },
        { band: 2, rate_per_1000l: 1200.5 },
      ],
      notes: 'new contract',
    });
  });

  it('sends a per-km rule with rental, and no bands', () => {
    const v = formFromRule('TAQA', taqa, '2026-10-25');
    expect(serializeRuleForm(v)).toEqual({
      company: 'TAQA',
      effective_from: '2026-11-01',
      method: 'per_km',
      per_km_rate: 50.5,
      vat_rate: 0.14,
      rental_mode: 'monthly_taper',
      rental_amount: 43000,
      rental_full_days: 28,
    });
  });

  it('leaves out rental_full_days for per_car_day, and both for none', () => {
    const v = formFromRule('TAQA', taqa, '2026-10-25');
    const perDay = serializeRuleForm({ ...v, rental_mode: 'per_car_day', rental_amount: '2000' });
    expect(perDay.rental_amount).toBe(2000);
    expect('rental_full_days' in perDay).toBe(false);
    const none = serializeRuleForm({ ...v, rental_mode: 'none' });
    expect('rental_amount' in none).toBe(false);
    expect('rental_full_days' in none).toBe(false);
  });

  it('sends nothing method-specific for the route-fee method', () => {
    const v = { ...formFromRule('Petrol Arrows', undefined, '2026-10-25'), method: 'per_1000l_fee' as const, vat_percent: '0' };
    const out = serializeRuleForm(v);
    expect(out).toEqual({
      company: 'Petrol Arrows',
      effective_from: '2026-10-26',
      method: 'per_1000l_fee',
      vat_rate: 0,
      rental_mode: 'none',
    });
  });
});

describe('nextBandNumber', () => {
  it('is one past the highest', () => {
    expect(nextBandNumber(blankBands())).toBe(16);
    expect(nextBandNumber([{ band: '3', rate: '' }, { band: 'x', rate: '' }])).toBe(4);
    expect(nextBandNumber([])).toBe(1);
  });
});
