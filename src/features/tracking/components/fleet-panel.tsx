import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, Eye, EyeOff, Search, X } from 'lucide-react';
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
/* The fleet panel — a slide-in list grouped by status. Row tap selects,      */
/* crosshair flies the camera, the eye hides a truck from the map.            */
/* -------------------------------------------------------------------------- */

function timeAgo(d: Date | null, locale: string): string {
  if (!d) return '—';
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (secs < 90) return rtf.format(-Math.round(secs), 'second');
  if (secs < 5400) return rtf.format(-Math.round(secs / 60), 'minute');
  if (secs < 129600) return rtf.format(-Math.round(secs / 3600), 'hour');
  return rtf.format(-Math.round(secs / 86400), 'day');
}

function plateDigits(plate: string): string {
  const d = plate.replace(/\D/g, '');
  return d || plate.trim();
}
function plateLetters(plate: string): string {
  return plate
    .split(/\s+/)
    .filter((w) => !/^\d+$/.test(w))
    .join(' ');
}

export function FleetPanel({
  open,
  vehicles,
  live,
  selectedId,
  hiddenIds,
  onClose,
  onSelect,
  onFocus,
  onToggleHidden,
}: {
  open: boolean;
  vehicles: Vehicle[];
  live: Map<string, LiveStatus>;
  selectedId: string | null;
  hiddenIds: Set<string>;
  onClose: () => void;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onToggleHidden: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = React.useState('');

  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const m = new Map<StatusGroup, Vehicle[]>();
    for (const v of vehicles) {
      if (q && !`${v.plate} ${v.codename}`.toLowerCase().includes(q)) continue;
      const g = groupOf(v, live.get(v.id) ?? null);
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(v);
    }
    for (const list of m.values()) list.sort((a, b) => a.plate.localeCompare(b.plate));
    return m;
  }, [vehicles, live, query]);

  return (
    <aside
      className={cn(
        'pointer-events-auto absolute inset-y-0 start-0 z-30 flex w-[300px] max-w-[86vw] flex-col',
        'border-e bg-card/95 shadow-lg backdrop-blur transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
      )}
      aria-hidden={!open}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="fleet-search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tracking.searchPlaceholder', 'Search plate or codename…')}
            className="h-8 w-full rounded-md border bg-background ps-8 pe-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {STATUS_ORDER.map((g) => {
          const members = grouped.get(g);
          if (!members?.length) return null;
          return (
            <React.Fragment key={g}>
              <div
                className="flex items-center gap-1.5 px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t(`tracking.group.${g}`, g)}
                <span className="font-normal text-muted-foreground">· {members.length}</span>
              </div>
              {members.map((v) => {
                const lv = live.get(v.id) ?? null;
                const hidden = hiddenIds.has(v.id);
                const selected = selectedId === v.id;
                return (
                  <div
                    key={v.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:bg-muted/50',
                      hidden && 'opacity-70',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: STATUS_COLOR[groupOf(v, lv)] }}
                    />
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      className="min-w-0 flex-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {plateDigits(v.plate)}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {plateLetters(v.plate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <span className="truncate">{lv?.statusLabel ?? v.statusLabel}</span>
                        {(lv?.speed ?? 0) > 0 && (
                          <span className="shrink-0 tabular-nums">
                            · {lv!.speed} {t('tracking.kmh', 'km/h')}
                          </span>
                        )}
                        <span className="ms-auto shrink-0 font-mono text-[9.5px]">
                          {timeAgo(lv?.timestamp ?? v.lastLocationAt, i18n.language)}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleHidden(v.id)}
                      aria-label={t(hidden ? 'tracking.show' : 'tracking.hide', hidden ? 'Show' : 'Hide')}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onFocus(v.id)}
                      aria-label={t('tracking.focus', 'Focus on map')}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </aside>
  );
}
