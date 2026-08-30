import { useTranslation } from 'react-i18next';

import type { Trip } from '@/entities/trip/schemas';
import { formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Truncate } from '@/shared/ui/truncate';
import { chargeLines, sumRevenue } from './revenue-lines';

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
          strong ? 'font-semibold text-money' : 'text-foreground',
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
/**
 * One container's revenue, pressable, with its own breakdown.
 *
 * A container earns its own money: its own base from its own volume or
 * distance, its own share of the car's rental, its own VAT. Showing the parent
 * a breakdown while its containers show bare figures made the children look
 * like a summary of the parent rather than the things being summarised.
 */
export function ContainerRevenue({ container }: { container: Trip }) {
  const { t } = useTranslation();
  if (container.allocated_total == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={t('trips.revenue.breakdownLabel')}
          className="rounded font-mono text-[12.5px] font-semibold tabular-nums text-money
                     underline decoration-dotted underline-offset-4 hover:bg-money/10
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {formatCurrency(container.allocated_total)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72"
        onClick={(e) => e.stopPropagation()}
      >
        <RevenueBreakdown containers={[container]} />
      </PopoverContent>
    </Popover>
  );
}

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
  const lines = chargeLines(containers, t);

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
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('trips.revenue.chargedOn')}
        </dt>
        {lines.map((line) => (
          <Line
            key={line.key}
            label={
              <span className="flex min-w-0 items-baseline gap-1.5">
                {line.count > 1 && (
                  <span className="shrink-0 rounded border px-1 font-mono text-[10px]">
                    ×{line.count}
                  </span>
                )}
                <Truncate dir="auto">{line.label}</Truncate>
              </span>
            }
            value={line.revenue != null ? formatCurrency(line.revenue) : '—'}
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
