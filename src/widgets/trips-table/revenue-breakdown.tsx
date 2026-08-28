import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { Trip } from '@/entities/trip/schemas';
import { formatCurrency, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* What a trip earned, and what it was charged on                              */
/*                                                                            */
/* One module because the table and the mobile list must never disagree about  */
/* a figure. Both render this; neither owns it.                                */
/* -------------------------------------------------------------------------- */

/** Companies billed on distance rather than volume. */
const DISTANCE_BILLED = new Set(['TAQA', 'Petromin']);

/**
 * Sum a revenue field across containers, preserving "not permitted".
 *
 * Undefined when no container carries the field — which is what a caller below
 * permission 4 receives, and must not become a confident zero.
 */
export function sumRevenue(
  trips: Trip[],
  key: 'revenue' | 'allocated_rental' | 'allocated_vat' | 'allocated_total',
): number | undefined {
  let total: number | undefined;
  for (const trip of trips) {
    const value = trip[key];
    if (value == null) continue;
    total = (total ?? 0) + value;
  }
  return total;
}

/**
 * What one container was charged on.
 *
 * `fee` means a different thing per company, which is why this cannot be a
 * single format string: a rate per 1,000 L for Petrol Arrows, a BAND NUMBER
 * from 1 to 15 for Watanya, and nothing at all for TAQA and Petromin, which
 * bill on distance. The rates themselves are deliberately not restated here —
 * they live in the backend's revenue module, and duplicating them on the
 * client is exactly how Go and Rust came to bill TAQA differently.
 */
export function feeBasis(trip: Trip, t: TFunction): string {
  if (DISTANCE_BILLED.has(trip.company)) {
    return `${formatNumber(trip.mileage || trip.distance || 0, 0)} km`;
  }
  const volume = formatNumber(trip.tank_capacity || 0, 0);
  if (trip.company === 'Watanya') {
    return t('trips.revenue.atBand', { volume, band: trip.fee ?? 0 });
  }
  return t('trips.revenue.atRate', { volume, rate: formatNumber(trip.fee ?? 0, 2) });
}

function Line({
  label,
  value,
  strong,
}: {
  label: React.ReactNode;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn('min-w-0', strong ? 'font-medium' : 'text-muted-foreground')}>{label}</dt>
      <dd
        className={cn(
          'shrink-0 font-mono tabular-nums',
          strong ? 'font-semibold text-money' : 'text-foreground/90',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The parts behind a revenue figure, with a fee line per container.
 *
 * A multi-drop trip carries different volumes to different routes and each
 * route has its own fee mapping — the real shape in production is one truck
 * dropping 13,000 L and 26,000 L at one place and 13,000 L at another. A single
 * "Fee" row cannot describe that, so every container states its own basis.
 */
export function RevenueBreakdown({ containers }: { containers: Trip[] }) {
  const { t } = useTranslation();

  const base = sumRevenue(containers, 'revenue') ?? 0;
  const rental = sumRevenue(containers, 'allocated_rental') ?? 0;
  const vat = sumRevenue(containers, 'allocated_vat') ?? 0;
  const total = sumRevenue(containers, 'allocated_total') ?? 0;

  // With no rental and no VAT the base IS the total, and printing both is the
  // same number twice. Petrol Arrows is always in that state, so this is the
  // common case rather than an edge one.
  const hasParts = rental !== 0 || vat !== 0;
  const multi = containers.length > 1;

  return (
    <div className="text-start text-[12.5px]">
      <dl className="space-y-1">
        {hasParts && (
          <>
            <Line label={t('trips.revenue.base')} value={formatCurrency(base)} />
            {rental !== 0 && (
              <Line label={t('trips.revenue.rentalShare')} value={formatCurrency(rental)} />
            )}
            {vat !== 0 && <Line label={t('trips.revenue.vat')} value={formatCurrency(vat)} />}
          </>
        )}
        <div className={cn(hasParts && 'border-t pt-1')}>
          <Line label={t('trips.revenue.total')} value={formatCurrency(total)} strong />
        </div>
      </dl>

      <dl className="mt-2 space-y-1 border-t pt-2">
        <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('trips.revenue.chargedOn')}
        </dt>
        {containers.map((c, i) => (
          <Line
            key={c.ID}
            label={
              <span className="flex min-w-0 items-baseline gap-1.5">
                {multi && (
                  <span className="shrink-0 rounded border px-1 font-mono text-[10px]">
                    {i + 1}
                  </span>
                )}
                <span className="truncate" dir="auto">
                  {feeBasis(c, t)}
                </span>
              </span>
            }
            value={c.revenue != null ? formatCurrency(c.revenue) : '—'}
          />
        ))}
      </dl>

      {rental !== 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {t('trips.revenue.shareHint')}
        </p>
      )}
    </div>
  );
}
