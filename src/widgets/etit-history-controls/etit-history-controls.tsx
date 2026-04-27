import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Gauge,
  Loader2,
  MapPin,
  Pause,
  RefreshCw,
  User,
  Zap,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { EtitDateTimeRange } from '@/widgets/etit-datetime-range/etit-datetime-range';
import type {
  EtitHistoryResponse,
  EtitTripSummary,
  EtitVehicle,
} from '@/entities/etit-vehicle/schemas';

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export interface EtitHistoryControlsProps {
  vehicle: EtitVehicle | null;
  history: EtitHistoryResponse | null;
  summary: EtitTripSummary | null;

  range: { from: Date; to: Date };
  onRangeChange: (range: { from: Date; to: Date }) => void;

  onLoad: (refresh?: boolean) => void;
  loading?: boolean;

  showStops: boolean;
  onShowStopsChange: (next: boolean) => void;
  showIgnitions: boolean;
  onShowIgnitionsChange: (next: boolean) => void;

  isFullScreen?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

function EtitHistoryControlsBase({
  vehicle,
  history,
  summary,
  range,
  onRangeChange,
  onLoad,
  loading,
  showStops,
  onShowStopsChange,
  showIgnitions,
  onShowIgnitionsChange,
  className,
}: EtitHistoryControlsProps) {
  const { t } = useTranslation();

  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const isLongPressRef = React.useRef(false);

  const handlePointerDown = React.useCallback(() => {
    isLongPressRef.current = false;
    const timer = setTimeout(() => {
      isLongPressRef.current = true;
      onLoad(true);
      setLongPressTimer(null);
    }, 700);
    setLongPressTimer(timer);
  }, [onLoad]);

  const handlePointerUp = React.useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      // If the timer was still running, it was a short click.
      if (!isLongPressRef.current) {
        onLoad(false);
      }
    }
  }, [longPressTimer, onLoad]);

  const handlePointerCancel = React.useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      {/* Header — vehicle + load button */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {vehicle ? `${vehicle.plate || vehicle.codename}` : t('etit.controls.noVehicle')}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {vehicle ? vehicle.statusLabel : t('etit.controls.noVehicleHint')}
          </p>
        </div>
        <Button
          size="sm"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          disabled={!vehicle || loading}
          className="gap-1.5 transition-transform active:scale-95 select-none"
          title={t('etit.controls.loadHistoryHint')}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className={cn('h-3.5 w-3.5', isLongPressRef.current && 'animate-spin')} />
          )}
          {t('etit.controls.loadHistory')}
        </Button>
      </div>

      {/* Datetime range */}
      <EtitDateTimeRange value={range} onChange={onRangeChange} className="mb-3" />

      {/* Overlay toggles */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t('etit.controls.overlays')}
        </span>
        <OverlayToggle
          active={showStops}
          onClick={() => onShowStopsChange(!showStops)}
          icon={<Pause className="h-3 w-3" />}
          label={t('etit.controls.toggleStops')}
          color="purple"
        />
        <OverlayToggle
          active={showIgnitions}
          onClick={() => onShowIgnitionsChange(!showIgnitions)}
          icon={<Zap className="h-3 w-3" />}
          label={t('etit.controls.toggleIgnitions')}
          color="cyan"
        />
      </div>

      {/* Stats — slot height is fixed across loading / data / placeholder */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[58px] rounded-md" />
          ))
        ) : history && summary ? (
          <>
            <Stat
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={t('etit.controls.stats.mileage')}
              value={`${summary.totalMileage} ${t('etit.units.km')}`}
            />
            <Stat
              icon={<Clock className="h-3.5 w-3.5" />}
              label={t('etit.controls.stats.activeTime')}
              value={summary.totalActiveTime || '—'}
            />
            <Stat
              icon={<Gauge className="h-3.5 w-3.5" />}
              label={t('etit.controls.stats.stops')}
              value={summary.numberOfStops || '0'}
            />
          </>
        ) : (
          <>
            <PlaceholderStat label={t('etit.controls.stats.mileage')} />
            <PlaceholderStat label={t('etit.controls.stats.activeTime')} />
            <PlaceholderStat label={t('etit.controls.stats.stops')} />
          </>
        )}
      </div>

      {/* Driver / counts */}
      {summary && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-md">
            <User className="h-3 w-3 text-primary/70" />
            <span className="text-foreground">{summary.driverName || t('etit.controls.unassignedDriver')}</span>
          </div>
          {summary.ignitionOnCount && (
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-success/70" />
              <span>{t('etit.controls.ignitionOn')}: <span className="text-foreground font-bold">{summary.ignitionOnCount}</span></span>
            </div>
          )}
          {summary.ignitionOffCount && (
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-destructive/70" />
              <span>{t('etit.controls.ignitionOff')}: <span className="text-foreground font-bold">{summary.ignitionOffCount}</span></span>
            </div>
          )}
          {summary.totalIdleTime && summary.totalIdleTime !== '00:00:00' && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-yellow-500/70" />
              <span>{t('etit.controls.idle')}: <span className="text-foreground font-bold">{summary.totalIdleTime}</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                        */
/* -------------------------------------------------------------------------- */

function OverlayToggle({
  active,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: 'purple' | 'cyan';
}) {
  const colorRing =
    color === 'purple'
      ? 'data-[active=true]:border-purple-500/50 data-[active=true]:bg-purple-500/10 data-[active=true]:text-purple-700 dark:data-[active=true]:text-purple-300'
      : 'data-[active=true]:border-cyan-500/50 data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-700 dark:data-[active=true]:text-cyan-300';

  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium transition-all',
        'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
        colorRing,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="group flex flex-col rounded-xl border bg-gradient-to-br from-card to-muted/20 p-3 transition-all hover:shadow-md hover:border-primary/20">
      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
        <div className="rounded-md bg-primary/10 p-1 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 truncate text-base font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function PlaceholderStat({ label }: { label: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-dashed bg-muted/5 p-3 opacity-40">
      <span className="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{label}</span>
      <span className="mt-2 text-base font-black tracking-tight text-muted-foreground/50">—</span>
    </div>
  );
}

export const EtitHistoryControls = React.memo(EtitHistoryControlsBase);
