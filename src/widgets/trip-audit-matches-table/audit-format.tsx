import { Badge } from '@/shared/ui/badge';
import { formatNumber } from '@/shared/lib/format';

/* -------------------------------------------------------------------------- */
/* Small display helpers shared by the trip-audit table and detail dialog.     */
/* -------------------------------------------------------------------------- */

/** "12.3" km with one decimal, or an em dash for null. */
export function formatKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '—';
  return formatNumber(km, 1);
}

/** "1h 23m" / "45m" / "30s" from seconds, or an em dash for null. */
export function formatDurationSecs(secs: number | null | undefined): string {
  if (secs == null || !Number.isFinite(secs) || secs < 0) return '—';
  const total = Math.round(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

/**
 * Ratio badge — actual vs OSRM optimal. Green up to 1.2x, amber up to
 * 1.5x, red beyond. Forced LTR so "1.35×" doesn't flip in RTL.
 */
export function RatioBadge({ ratio }: { ratio: number | null | undefined }) {
  if (ratio == null || !Number.isFinite(ratio)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const variant = ratio <= 1.2 ? 'success' : ratio <= 1.5 ? 'warning' : 'destructive';
  return (
    <Badge variant={variant} className="tabular-nums" dir="ltr">
      {ratio.toFixed(2)}×
    </Badge>
  );
}
