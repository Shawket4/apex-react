/**
 * Money stays a decimal STRING from the wire to the screen.
 *
 * The API serialises NUMERIC(18,4) as strings ("9000.0000") precisely so no
 * JS float ever touches an amount. These helpers format such strings for
 * display without converting to `number`: the integer part is grouped via
 * Intl (BigInt overload, lossless), the fraction is rounded with BigInt
 * arithmetic. Chart geometry may convert to number — pixels are approximate
 * by nature — but any figure a human reads comes through here.
 */

let cachedGroupFmt: Intl.NumberFormat | null = null;
let cachedFracFmt: Intl.NumberFormat | null = null;
let cachedDecimalSep: string | null = null;

function groupFmt(): Intl.NumberFormat {
  cachedGroupFmt ??= new Intl.NumberFormat(undefined);
  return cachedGroupFmt;
}

function fracFmt(): Intl.NumberFormat {
  cachedFracFmt ??= new Intl.NumberFormat(undefined, { useGrouping: false });
  return cachedFracFmt;
}

function decimalSep(): string {
  if (cachedDecimalSep == null) {
    cachedDecimalSep =
      new Intl.NumberFormat(undefined)
        .formatToParts(1.1)
        .find((p) => p.type === 'decimal')?.value ?? '.';
  }
  return cachedDecimalSep;
}

/**
 * Format a decimal string for display, exactly.
 *
 * "9000.0000" → "9,000.00" · "-462807.355" → "-462,807.36" (round half-up).
 * Falls back to Number formatting only for input that is not a plain decimal
 * string (which the API never sends).
 */
export function formatMoney(value: string | null | undefined, decimals = 2): string {
  let s = (value ?? '0').trim();
  if (s === '') s = '0';

  let sign = '';
  if (s.startsWith('-')) {
    sign = '-';
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (!/^\d+(\.\d*)?$/.test(s)) {
    const n = Number(value);
    return Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : String(value);
  }

  const dot = s.indexOf('.');
  let int = dot === -1 ? s : s.slice(0, dot);
  let frac = dot === -1 ? '' : s.slice(dot + 1);

  if (frac.length > decimals) {
    // Round half-up with BigInt — no float, no drift, carries handled.
    const roundUp = frac.charCodeAt(decimals) >= 53; /* '5' */
    let scaled = BigInt((int || '0') + frac.slice(0, decimals));
    if (roundUp) scaled += 1n;
    const str = scaled.toString().padStart(decimals + 1, '0');
    int = decimals ? str.slice(0, -decimals) : str;
    frac = decimals ? str.slice(-decimals) : '';
  } else {
    frac = frac.padEnd(decimals, '0');
  }

  const grouped = groupFmt().format(BigInt(int || '0'));
  if (!frac) return sign + grouped;

  // Format the fraction digits through Intl too, so locales that use
  // Eastern Arabic numerals stay consistent across the separator.
  const fracDigits = fracFmt()
    .format(BigInt(frac))
    .padStart(frac.length, fracFmt().format(0n));
  return sign + grouped + decimalSep() + fracDigits;
}

/** "9000.0000" → "9000" · "8.9900" → "8.99" — for editing in a text input. */
export function trimMoney(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  if (!/^[-+]?\d+(\.\d*)?$/.test(s)) return s;
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}

/**
 * Exact sum of decimal strings (BigInt over scaled integers). Used only where
 * no server-side bucket exists — e.g. the chart legend's "Other" aggregate.
 * Day and range totals must keep coming from /transactions/statistics.
 */
export function addMoneyStrings(values: Array<string | null | undefined>): string {
  let maxFrac = 0;
  const parts = values.map((v) => {
    let s = (v ?? '0').trim() || '0';
    let neg = false;
    if (s.startsWith('-')) {
      neg = true;
      s = s.slice(1);
    } else if (s.startsWith('+')) {
      s = s.slice(1);
    }
    if (!/^\d+(\.\d*)?$/.test(s)) return { neg: false, int: '0', frac: '' };
    const dot = s.indexOf('.');
    const int = dot === -1 ? s : s.slice(0, dot);
    const frac = dot === -1 ? '' : s.slice(dot + 1);
    maxFrac = Math.max(maxFrac, frac.length);
    return { neg, int, frac };
  });

  let total = 0n;
  for (const p of parts) {
    const scaled = BigInt((p.int || '0') + p.frac.padEnd(maxFrac, '0'));
    total += p.neg ? -scaled : scaled;
  }

  const neg = total < 0n;
  const abs = (neg ? -total : total).toString().padStart(maxFrac + 1, '0');
  const int = maxFrac ? abs.slice(0, -maxFrac) : abs;
  const frac = maxFrac ? abs.slice(-maxFrac) : '';
  return (neg ? '-' : '') + int + (frac ? '.' + frac : '');
}
