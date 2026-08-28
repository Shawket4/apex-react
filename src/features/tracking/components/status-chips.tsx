import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import {
  STATUS_COLOR,
  STATUS_ORDER,
  statusGroup,
  type LiveStatus,
  type StatusGroup,
  type Vehicle,
} from '../schemas';

/* -------------------------------------------------------------------------- */
/* Floating status bar — the fleet at a glance, and the map's filter. Tap a   */
/* chip to isolate that group; tap again to clear.                             */
/* -------------------------------------------------------------------------- */

export function groupOf(vehicle: Vehicle, live: LiveStatus | null): StatusGroup {
  return statusGroup(live?.status ?? vehicle.status);
}

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
    <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
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
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold shadow-sm backdrop-blur transition-colors',
              active
                ? 'border-transparent text-white'
                : 'border-border bg-card/90 text-foreground hover:bg-card',
            )}
            style={active ? { background: STATUS_COLOR[g] } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: active ? '#fff' : STATUS_COLOR[g] }}
            />
            {t(`tracking.group.${g}`, g)}
            <span className={cn('tabular-nums', active ? 'opacity-90' : 'text-muted-foreground')}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
