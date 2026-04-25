// shared/lib/format-number.ts

/**
 * Format a number to two decimals, trimming trailing zeros.
 * 1234.5 → "1234.5", 1234 → "1234", 1234.567 → "1234.57"
 */
export function formatNumber(value: number, decimals = 2): string {
    if (!Number.isFinite(value)) return '0';
    return value
        .toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
        });
}

/**
 * Compact form for tight UI: 2,150,000 → "2.15M", 12,400 → "12.4K".
 * Falls back to the full formatted number below the threshold.
 */
export function formatCompactNumber(value: number, decimals = 2): string {
    if (!Number.isFinite(value)) return '0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`;
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`;
    if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(decimals)}K`;

    return formatNumber(value, decimals);
}

/** Currency variant. Pass piastres/cents and set divisor=100 if needed. */
export function formatCompactCurrency(
    value: number,
    currency = 'EGP',
    decimals = 2,
): string {
    if (!Number.isFinite(value)) return `0 ${currency}`;
    const abs = Math.abs(value);

    if (abs >= 10_000) {
        return `${formatCompactNumber(value, decimals)} ${currency}`;
    }
    return `${formatNumber(value, decimals)} ${currency}`;
}