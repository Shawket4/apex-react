import type {
  PricingMethod,
  PricingRule,
  PricingRuleInput,
  RentalMode,
} from './schemas';

/* -------------------------------------------------------------------------- */
/* The "new version" form, as plain data                                       */
/*                                                                            */
/* Every number is held as the string the person typed so a half-typed value  */
/* ("14.", "") never snaps to 0 under their cursor. VAT is a percentage here    */
/* and a fraction on the wire: 14 ↔ 0.14. Serialisation sends only the fields   */
/* the method and rental mode use — the server refuses the others.             */
/* -------------------------------------------------------------------------- */

export interface BandRow {
  band: string;
  rate: string;
}

export interface RuleFormValues {
  company: string;
  effective_from: string;
  method: PricingMethod;
  per_km_rate: string;
  vat_percent: string;
  rental_mode: RentalMode;
  rental_amount: string;
  rental_full_days: string;
  notes: string;
  bands: BandRow[];
}

/** Field → i18n key under `pricing.form.errors`. */
export type RuleFormErrors = Partial<Record<keyof RuleFormValues, string>> & {
  /** Per band row, by index. */
  bandRows?: Record<number, string>;
};

export const DEFAULT_BAND_COUNT = 15;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A number typed by a person: commas and spaces dropped, Arabic-Indic digits read. */
export function parseNumberInput(raw: string): number | null {
  const ascii = raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[,\s٬]/g, '');
  if (ascii === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(ascii)) return null;
  const n = Number(ascii);
  return Number.isFinite(n) ? n : null;
}

/** 14 → 0.14, with float noise removed (14.5 → 0.145, not 0.14500000000000002). */
export function vatPercentToFraction(percent: number): number {
  return Math.round(percent * 10_000) / 1_000_000;
}

/** 0.14 → 14 (and 0.145 → 14.5). */
export function vatFractionToPercent(fraction: number): number {
  return Math.round(fraction * 1_000_000) / 10_000;
}

/** "2026-10-25" → "2026-11-01". */
export function firstDayOfNextMonth(today: string): string {
  const [y, m] = today.split('-').map(Number);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}-01`;
}

/** "2026-10-25" → "2026-10-26". */
export function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/**
 * The date a new version starts on unless the person says otherwise.
 *
 * Rental is a monthly contract: a version starting mid-month only reaches
 * rental from the following month, so a rule with rental starts on the 1st of
 * next month. A rule without rental starts tomorrow — today's trips may
 * already be priced and a re-price is a separate, deliberate step.
 */
export function defaultEffectiveFrom(rentalMode: RentalMode, today: string): string {
  return rentalMode === 'none' ? nextDay(today) : firstDayOfNextMonth(today);
}

function numStr(n: number | null | undefined): string {
  return n == null ? '' : String(n);
}

export function blankBands(count = DEFAULT_BAND_COUNT): BandRow[] {
  return Array.from({ length: count }, (_, i) => ({ band: String(i + 1), rate: '' }));
}

/** A new version seeded from the version in force (or a blank one). */
export function formFromRule(
  company: string,
  base: PricingRule | undefined,
  today: string,
): RuleFormValues {
  const method = base?.method ?? 'per_km';
  const rentalMode = base?.rental_mode ?? 'none';
  return {
    company,
    effective_from: defaultEffectiveFrom(rentalMode, today),
    method,
    per_km_rate: numStr(base?.per_km_rate),
    vat_percent: base ? String(vatFractionToPercent(base.vat_rate)) : '14',
    rental_mode: rentalMode,
    rental_amount: numStr(base?.rental_amount),
    rental_full_days: numStr(base?.rental_full_days),
    notes: '',
    bands:
      base && base.bands.length > 0
        ? [...base.bands]
            .sort((a, b) => a.band - b.band)
            .map((b) => ({ band: String(b.band), rate: String(b.rate_per_1000l) }))
        : blankBands(),
  };
}

/** The next band number to add: one past the highest typed. */
export function nextBandNumber(rows: BandRow[]): number {
  const nums = rows.map((r) => parseNumberInput(r.band)).filter((n): n is number => n != null);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

/**
 * Validate the form. Mirrors FalconGo's RuleInput.Validate so a refusal shows
 * on the field instead of as a toast; `existingDates` are the company's
 * versions, since a second version on the same date is a 409.
 */
export function validateRuleForm(
  v: RuleFormValues,
  existingDates: readonly string[] = [],
): RuleFormErrors {
  const e: RuleFormErrors = {};

  if (!v.company.trim()) e.company = 'company';

  if (!DATE_RE.test(v.effective_from) || Number.isNaN(Date.parse(v.effective_from))) {
    e.effective_from = 'date';
  } else if (existingDates.includes(v.effective_from)) {
    e.effective_from = 'duplicateDate';
  }

  const vat = parseNumberInput(v.vat_percent);
  if (vat == null || vat < 0 || vat >= 100) e.vat_percent = 'vat';

  if (v.method === 'per_km') {
    const rate = parseNumberInput(v.per_km_rate);
    if (rate == null || rate <= 0) e.per_km_rate = 'positive';
  }

  if (v.method === 'band_per_1000l') {
    const rows: Record<number, string> = {};
    const seen = new Set<number>();
    v.bands.forEach((row, i) => {
      const band = parseNumberInput(row.band);
      const rate = parseNumberInput(row.rate);
      if (band == null || !Number.isInteger(band) || band < 1) rows[i] = 'bandNumber';
      else if (seen.has(band)) rows[i] = 'bandDuplicate';
      else if (rate == null || rate <= 0) rows[i] = 'bandRate';
      if (band != null) seen.add(band);
    });
    if (v.bands.length === 0) e.bands = 'bandsRequired';
    if (Object.keys(rows).length > 0) {
      e.bandRows = rows;
      e.bands ??= 'bandsInvalid';
    }
  }

  if (v.rental_mode !== 'none') {
    const amount = parseNumberInput(v.rental_amount);
    if (amount == null || amount <= 0) e.rental_amount = 'positive';
  }
  if (v.rental_mode === 'monthly_taper') {
    const days = parseNumberInput(v.rental_full_days);
    if (days == null || !Number.isInteger(days) || days < 1 || days > 31) {
      e.rental_full_days = 'fullDays';
    }
  }

  return e;
}

export function hasErrors(e: RuleFormErrors): boolean {
  return Object.keys(e).length > 0;
}

/**
 * The request body. Call only on a form `validateRuleForm` passed: unparseable
 * numbers are a programming error here, not a user one.
 */
export function serializeRuleForm(v: RuleFormValues): PricingRuleInput {
  const num = (s: string) => {
    const n = parseNumberInput(s);
    if (n == null) throw new Error(`serializeRuleForm: "${s}" is not a number`);
    return n;
  };

  const out: PricingRuleInput = {
    company: v.company.trim(),
    effective_from: v.effective_from,
    method: v.method,
    vat_rate: vatPercentToFraction(num(v.vat_percent)),
    rental_mode: v.rental_mode,
  };

  if (v.method === 'per_km') out.per_km_rate = num(v.per_km_rate);
  if (v.method === 'band_per_1000l') {
    out.bands = v.bands
      .map((b) => ({ band: num(b.band), rate_per_1000l: num(b.rate) }))
      .sort((a, b) => a.band - b.band);
  }
  if (v.rental_mode !== 'none') out.rental_amount = num(v.rental_amount);
  if (v.rental_mode === 'monthly_taper') out.rental_full_days = num(v.rental_full_days);

  const notes = v.notes.trim();
  if (notes) out.notes = notes;
  return out;
}
