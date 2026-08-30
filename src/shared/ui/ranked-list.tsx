import * as React from 'react';
import { cn } from '@/shared/lib/cn';

export interface RankedListItem {
  /** Stable key for React reconciliation */
  id: string | number;
  /** Primary label, shown left */
  label: React.ReactNode;
  /** Optional small label below, e.g. counts or units */
  sublabel?: React.ReactNode;
  /** Numeric magnitude — drives bar width. Higher = wider bar. */
  value: number;
  /** Right-aligned formatted value (e.g. "EGP 4,495.00") */
  valueLabel: React.ReactNode;
  /** Right-aligned secondary line (e.g. "×29") */
  countLabel?: React.ReactNode;
  /** Optional click handler for drill-down */
  onClick?: () => void;
}

interface RankedListProps {
  items: RankedListItem[];
  /**
   * Optional bar tint — defaults to the primary brand color. Pass a Tailwind
   * arbitrary class (e.g. `bg-emerald-500`) to override per-list.
   */
  barClassName?: string;
  /** Fallback shown when items is empty. */
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * A vertically-stacked top-N list with proportional bar widths.
 *
 *   Item label                     EGP 4,495.00
 *   ──────────────────────────         ×29
 *
 *   Item label                     EGP 2,900.00
 *   ──────────────                     ×20
 *
 * The widest bar in the list always fills 100% of the row's available width;
 * everything else scales relative to it. Useful for "top items / drivers /
 * routes" panels in dashboards. Click handlers turn rows into buttons.
 */
export function RankedList({
  items,
  barClassName,
  emptyState,
  className,
}: RankedListProps) {
  const max = React.useMemo(
    () => items.reduce((m, it) => Math.max(m, it.value), 0),
    [items],
  );

  if (items.length === 0) {
    return (
      <div className={cn('py-6 text-center text-xs text-muted-foreground', className)}>
        {emptyState ?? <span className="opacity-40">—</span>}
      </div>
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item) => {
        const widthPct = max > 0 ? (item.value / max) * 100 : 0;
        const Wrapper = item.onClick ? 'button' : 'div';

        return (
          <li key={item.id}>
            <Wrapper
              type={item.onClick ? 'button' : undefined}
              onClick={item.onClick}
              className={cn(
                'block w-full text-start',
                item.onClick &&
                  'cursor-pointer rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring -mx-1 px-1',
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium" dir="auto">
                  {item.label}
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                  {item.valueLabel}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="h-[15px] w-full overflow-hidden rounded bg-muted">
                  <div
                    className={cn('block h-full rounded bg-money', barClassName)}
                    style={{ width: `${Math.max(widthPct, 2)}%` }}
                  />
                </div>
                {(item.countLabel || item.sublabel) && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {item.countLabel ?? item.sublabel}
                  </span>
                )}
              </div>
            </Wrapper>
          </li>
        );
      })}
    </ul>
  );
}
