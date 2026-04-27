import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, Truck, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { SearchInput } from '@/shared/ui/search-input';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { matches } from '@/shared/lib/normalize';
import { formatCairo } from '@/entities/etit-vehicle/cairo';
import {
  classifyStatus,
  ETIT_STATUS_COLOR,
  type EtitLiveStatus,
  type EtitVehicle,
} from '@/entities/etit-vehicle/schemas';

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitVehicleListProps {
  vehicles: EtitVehicle[];
  liveStatuses: EtitLiveStatus[];
  selectedId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  className?: string;
}

type StatusFilter = 'all' | 'online' | 'moving' | 'idling' | 'offline';

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function EtitVehicleList({
  vehicles,
  liveStatuses,
  selectedId,
  loading,
  onSelect,
  onFocus,
  className,
}: EtitVehicleListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [filter, setFilter] = React.useState<StatusFilter>('all');

  const liveById = React.useMemo(() => {
    const m = new Map<string, EtitLiveStatus>();
    for (const s of liveStatuses) m.set(s.id, s);
    return m;
  }, [liveStatuses]);

  const filtered = React.useMemo(() => {
    return vehicles
      .filter((v) => {
        if (debouncedSearch.trim()) {
          const haystack = `${v.plate} ${v.codename}`;
          if (!matches(haystack, debouncedSearch)) return false;
        }
        if (filter === 'all') return true;
        const live = liveById.get(v.id);
        if (filter === 'online') return v.online;
        if (filter === 'offline') return !v.online;
        const group = live ? classifyStatus(live.status) : classifyStatus(v.status);
        if (filter === 'moving') return group === 'moving';
        if (filter === 'idling') return group === 'idling';
        return true;
      })
      .sort((a, b) => {
        // Online first, then alphabetic by plate
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.plate.localeCompare(b.plate);
      });
  }, [vehicles, debouncedSearch, filter, liveById]);

  // Quick stats for the filter buttons — counts visible to the current
  // search but not the current status filter (so "5 moving / 12 online"
  // stays informative as you flip filters).
  const counts = React.useMemo(() => {
    const visible = vehicles.filter((v) =>
      debouncedSearch.trim() ? matches(`${v.plate} ${v.codename}`, debouncedSearch) : true,
    );
    let online = 0;
    let moving = 0;
    let idling = 0;
    let offline = 0;
    for (const v of visible) {
      if (v.online) online++;
      else offline++;
      const live = liveById.get(v.id);
      const group = live ? classifyStatus(live.status) : classifyStatus(v.status);
      if (group === 'moving') moving++;
      if (group === 'idling') idling++;
    }
    return { all: visible.length, online, moving, idling, offline };
  }, [vehicles, debouncedSearch, liveById]);

  return (
    <aside
      className={cn(
        'flex flex-col border-e bg-card',
        // Caller controls width — we only constrain the inner layout.
        className,
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b p-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('etit.list.searchPlaceholder')}
          className="mb-2"
        />
        <div className="flex flex-wrap gap-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
            {t('etit.list.filter.all')}
          </FilterChip>
          <FilterChip
            active={filter === 'online'}
            onClick={() => setFilter('online')}
            count={counts.online}
          >
            {t('etit.list.filter.online')}
          </FilterChip>
          <FilterChip
            active={filter === 'moving'}
            onClick={() => setFilter('moving')}
            count={counts.moving}
          >
            {t('etit.list.filter.moving')}
          </FilterChip>
          <FilterChip
            active={filter === 'idling'}
            onClick={() => setFilter('idling')}
            count={counts.idling}
          >
            {t('etit.list.filter.idling')}
          </FilterChip>
          <FilterChip
            active={filter === 'offline'}
            onClick={() => setFilter('offline')}
            count={counts.offline}
          >
            {t('etit.list.filter.offline')}
          </FilterChip>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <ul className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-14 rounded-md" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Truck className="h-5 w-5" />}
              title={t('etit.list.empty.title')}
              description={
                debouncedSearch
                  ? t('etit.list.empty.descriptionSearch')
                  : t('etit.list.empty.description')
              }
              className="border-0 bg-transparent px-0 py-8"
            />
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {filtered.map((v) => {
              const live = liveById.get(v.id);
              const group = live ? classifyStatus(live.status) : classifyStatus(v.status);
              const color = ETIT_STATUS_COLOR[group];
              const speed = live?.speed ?? v.speed;
              const lastSeen = live?.timestamp ?? v.lastLocationAt;
              const isSelected = selectedId === v.id;
              const displayName = v.plate || v.codename;

              return (
                <li key={v.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-md border border-transparent px-2 py-2 transition-colors',
                      isSelected
                        ? 'border-primary/30 bg-primary/5'
                        : 'hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    {/* Status dot */}
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />

                    {/* Main click target */}
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      className="min-w-0 flex-1 text-start"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{displayName}</span>
                        {v.online ? (
                          <Wifi className="h-3 w-3 shrink-0 text-success" />
                        ) : (
                          <WifiOff className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{live?.statusLabel ?? v.statusLabel}</span>
                        {speed > 0 && (
                          <span className="tabular-nums">
                            · {speed} {t('etit.units.kmh')}
                          </span>
                        )}
                      </div>
                      {lastSeen && (
                        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {formatCairo(lastSeen, 'datetime')}
                        </div>
                      )}
                    </button>

                    {/* Focus button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[active=true]:opacity-100"
                      data-active={isSelected ? 'true' : 'false'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocus(v.id);
                      }}
                      title={t('etit.list.focusOnMap')}
                      aria-label={t('etit.list.focusOnMapFor', { name: displayName })}
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                        */
/* -------------------------------------------------------------------------- */

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}

function FilterChip({ active, onClick, count, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/70',
      )}
    >
      {children}
      <span
        className={cn(
          'inline-block min-w-[1.25rem] rounded-full px-1 text-center text-[10px] font-semibold tabular-nums',
          active ? 'bg-primary-foreground/20' : 'bg-background',
        )}
      >
        {count}
      </span>
    </button>
  );
}
