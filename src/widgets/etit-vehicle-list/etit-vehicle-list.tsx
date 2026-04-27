import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, Eye, EyeOff, Truck, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { SearchInput } from '@/shared/ui/search-input';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Checkbox } from '@/shared/ui/checkbox';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { matches } from '@/shared/lib/normalize';
import { formatCairo } from '@/entities/etit-vehicle/cairo';
import {
  classifyStatus,
  isEtitOnline,
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
  activeId: string | null;
  visibleIds: Set<string>;
  loading?: boolean;
  onActivate: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onSetAllVisible: (ids: string[]) => void;
  onClearVisible: () => void;
  onFocus: (id: string) => void;
  className?: string;
}

type StatusFilter = 'all' | 'online' | 'moving' | 'idling' | 'offline';

/* -------------------------------------------------------------------------- */
/* Vehicle Row                                                                 */
/* -------------------------------------------------------------------------- */

interface VehicleRowProps {
  vehicle: EtitVehicle;
  live: EtitLiveStatus | undefined;
  activeId: string | null;
  visibleIds: Set<string>;
  onActivate: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onFocus: (id: string) => void;
}

const VehicleRow = React.memo(({
  vehicle,
  live,
  activeId,
  visibleIds,
  onActivate,
  onToggleVisible,
  onFocus,
}: VehicleRowProps) => {
  const { t } = useTranslation();
  const status = live?.status ?? vehicle.status;
  const isOnline = isEtitOnline(status);
  const group = classifyStatus(status);
  const color = ETIT_STATUS_COLOR[group];
  const speed = live?.speed ?? vehicle.speed;
  const lastSeen = live?.timestamp ?? vehicle.lastLocationAt;
  const isActive = activeId === vehicle.id;
  const isVisible = visibleIds.has(vehicle.id);
  const displayName = vehicle.plate || vehicle.codename;

  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-md border border-transparent px-2 py-2 transition-colors',
          isActive
            ? 'border-primary/40 bg-primary/5'
            : 'hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Checkbox
          checked={isVisible}
          onCheckedChange={() => onToggleVisible(vehicle.id)}
          aria-label={
            isVisible
              ? t('etit.list.hideFromMap', { name: displayName })
              : t('etit.list.showOnMap', { name: displayName })
          }
          onClick={(e) => e.stopPropagation()}
        />

        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
          style={{ backgroundColor: color }}
          aria-hidden
        />

        <button
          type="button"
          onClick={() => onActivate(vehicle.id)}
          className="min-w-0 flex-1 text-start"
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            {isOnline ? (
              <Wifi className="h-3 w-3 shrink-0 text-success" />
            ) : (
              <WifiOff className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            {isVisible ? (
              <Eye className="h-3 w-3 shrink-0 text-primary" />
            ) : (
              <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{live?.statusLabel ?? vehicle.statusLabel}</span>
            {speed > 0 && (
              <span className="tabular-nums">
                · {speed} {t('etit.units.kmh')}
              </span>
            )}
          </div>
          {lastSeen && (
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
              {formatCairo(lastSeen, 'datetime')}
            </div>
          )}
        </button>

        <Button
          type="button"
          variant={isActive ? 'default' : 'ghost'}
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onFocus(vehicle.id);
          }}
          title={t('etit.list.focusOnMap')}
          aria-label={t('etit.list.focusOnMapFor', { name: displayName })}
        >
          <Crosshair className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
});

VehicleRow.displayName = 'VehicleRow';

/* -------------------------------------------------------------------------- */
/* Main Component                                                              */
/* -------------------------------------------------------------------------- */

function EtitVehicleListBase({
  vehicles,
  liveStatuses,
  activeId,
  visibleIds,
  loading,
  onActivate,
  onToggleVisible,
  onSetAllVisible,
  onClearVisible,
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
        if (filter === 'online') return isEtitOnline(live?.status ?? v.status);
        if (filter === 'offline') return !isEtitOnline(live?.status ?? v.status);
        const group = live ? classifyStatus(live.status) : classifyStatus(v.status);
        if (filter === 'moving') return group === 'moving';
        if (filter === 'idling') return group === 'idling';
        return true;
      })
      .sort((a, b) => {
        const aOnline = isEtitOnline(liveById.get(a.id)?.status ?? a.status);
        const bOnline = isEtitOnline(liveById.get(b.id)?.status ?? b.status);

        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return a.plate.localeCompare(b.plate);
      });
  }, [vehicles, debouncedSearch, filter, liveById]);

  const counts = React.useMemo(() => {
    const visible = vehicles.filter((v) =>
      debouncedSearch.trim() ? matches(`${v.plate} ${v.codename}`, debouncedSearch) : true,
    );
    let online = 0;
    let moving = 0;
    let idling = 0;
    let offline = 0;
    for (const v of visible) {
      const live = liveById.get(v.id);
      const status = live?.status ?? v.status;
      const group = classifyStatus(status);
      const isOnline = isEtitOnline(status);

      if (isOnline) online++;
      else offline++;

      if (group === 'moving') moving++;
      if (group === 'idling') idling++;
    }
    return { all: visible.length, online, moving, idling, offline };
  }, [vehicles, debouncedSearch, liveById]);

  const visibleCountInFilter = React.useMemo(
    () => filtered.filter((v) => visibleIds.has(v.id)).length,
    [filtered, visibleIds],
  );
  const allFilteredVisible = filtered.length > 0 && visibleCountInFilter === filtered.length;
  const someFilteredVisible = visibleCountInFilter > 0 && !allFilteredVisible;

  return (
    <aside
      className={cn(
        'flex flex-col border-e bg-card',
        className,
      )}
    >
      {/* Header */}
      <div className="shrink-0 border-b">
        <div className="p-3 pb-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('etit.list.searchPlaceholder')}
          />
        </div>

        {/* Show / hide bar */}
        <div className="flex items-center gap-2 border-y bg-muted/30 px-3 py-1.5 text-[11px]">
          <Checkbox
            checked={allFilteredVisible ? true : someFilteredVisible ? 'indeterminate' : false}
            onCheckedChange={(checked) => {
              if (checked) onSetAllVisible(filtered.map((v) => v.id));
              else onClearVisible();
            }}
            aria-label={t('etit.list.toggleAllVisible')}
          />
          <span className="font-medium">
            {t('etit.list.shownOnMap', {
              shown: visibleCountInFilter,
              total: filtered.length,
            })}
          </span>
          {visibleCountInFilter > 0 && (
            <button
              type="button"
              className="ms-auto text-muted-foreground hover:text-foreground"
              onClick={onClearVisible}
            >
              {t('etit.list.hideAll')}
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1 p-3 pt-2">
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
            {filtered.map((v) => (
              <VehicleRow
                key={v.id}
                vehicle={v}
                live={liveById.get(v.id)}
                activeId={activeId}
                visibleIds={visibleIds}
                onActivate={onActivate}
                onToggleVisible={onToggleVisible}
                onFocus={onFocus}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}

export const EtitVehicleList = React.memo(EtitVehicleListBase);

/* -------------------------------------------------------------------------- */
/* Filter chip                                                                 */
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
