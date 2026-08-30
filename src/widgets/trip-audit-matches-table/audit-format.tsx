import { Badge } from '@/shared/ui/badge';
import { formatNumber } from '@/shared/lib/format';

/**
 * Ratio badge — actual vs OSRM optimal. Green up to 1.2x, amber up to
 * 1.5x, red beyond. Forced LTR so "1.35×" doesn't flip in RTL.
 */
export function RatioBadge({ ratio }: { ratio: number | null | undefined }) {
  if (ratio == null || !Number.isFinite(ratio)) {
    return <span className="opacity-40">—</span>;
  }
  const variant = ratio <= 1.2 ? 'success' : ratio <= 1.5 ? 'warning' : 'destructive';
  return (
    <Badge variant={variant} className="tabular-nums" dir="ltr">
      {formatNumber(ratio, 2)}×
    </Badge>
  );
}
