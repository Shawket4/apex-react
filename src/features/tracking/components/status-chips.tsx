import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import {
  STATUS_COLOR,
  STATUS_ORDER,
  type LiveStatus,
  type StatusGroup,
  type Vehicle,
} from '../schemas';
import { groupOf } from './status-group';

/* -------------------------------------------------------------------------- */
/* Floating status bar — the fleet at a glance, and the map's filter. Tap a   */
/* chip to isolate that group; tap again to clear.                             */
/* -------------------------------------------------------------------------- */

export function StatusChips({
  vehicles,
  live,
  activeGroup,
  onToggleGroup,
}: {
  vehicles: Vehicle[];
  live: Map<string, LiveStatus>;
  activeGroup: StatusGroup | null;
  onToggleGroup: (g: StatusGroup | null) => void;
}) {
  const { t } = useTranslation();

  const counts = React.useMemo(() => {
    const m = new Map<StatusGroup, number>();
    for (const v of vehicles) {
      const g = groupOf(v, live.get(v.id) ?? null);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  }, [vehicles, live]);

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
      {STATUS_ORDER.map((g) => {
        const count = counts.get(g) ?? 0;
        if (count === 0) return null;
        const active = activeGroup === g;
        return (
          <button
            key={g}
            type="button"
            aria-pressed={active}
            onClick={() => onToggleGroup(active ? null : g)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1',
              active
                ? ''
                : 'border-border bg-card/90 text-foreground hover:bg-card',
            )}
            style={
              active
                ? {
                    borderColor: `${STATUS_COLOR[g]}66`,
                    background: `${STATUS_COLOR[g]}1a`,
                    color: STATUS_COLOR[g],
                  }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: STATUS_COLOR[g] }}
            />
            <span className="hidden sm:inline">{t(`tracking.group.${g}`, g)}</span>
            <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-muted-foreground')}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
