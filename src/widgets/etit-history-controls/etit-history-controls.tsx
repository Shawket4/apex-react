import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Fuel, Gauge, Loader2, MapPin, RefreshCw, User } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import {
  cairoEndOfDay,
  cairoFromParts,
  cairoStartOfDay,
  formatCairo,
} from '@/entities/etit-vehicle/cairo';
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
  /** Loaded history response — used for the inline stats strip. */
  history: EtitHistoryResponse | null;
  /** Trip summary (driver name, totals etc.). */
  summary: EtitTripSummary | null;

  /** Range currently chosen in the picker (UTC `Date`s pinned to Cairo days). */
  range: { from: Date; to: Date };
  onRangeChange: (range: { from: Date; to: Date }) => void;

  /** Fired when the user clicks "Load" to actually fetch the history. */
  onLoad: () => void;

  loading?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Date-range picker bridge                                                    */
/*                                                                             */
/* The shared DateRangePicker speaks ISO strings of the *browser's* local    */
/* day boundaries. We translate to/from Cairo: when the user picks "today"  */
/* we want the Cairo day, not the browser-local day. Sender + receiver are  */
/* both pure functions over `cairoStartOfDay` / `cairoEndOfDay`.            */
/* -------------------------------------------------------------------------- */

function rangeToPickerStrings(range: { from: Date; to: Date }): {
  from: string;
  to: string;
} {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

/**
 * The picker emits an ISO string whose local-time is the boundary of the
 * picked day. We re-anchor to Cairo: parse the calendar day from the
 * incoming ISO and reconstruct the matching Cairo midnight / 23:59:59.
 */
function pickerStringsToRange(
  from: string | null,
  to: string | null,
  fallback: { from: Date; to: Date },
): { from: Date; to: Date } {
  if (!from || !to) return fallback;
  const f = new Date(from);
  const t = new Date(to);
  if (!Number.isFinite(f.getTime()) || !Number.isFinite(t.getTime())) return fallback;

  // Pull the calendar parts the picker meant (browser-local day) and
  // realign to Cairo. We use UTC parts because the picker generates
  // boundary-of-local-day ISO; the calendar day matches in UTC up to
  // a 12h shift, which is fine for "yesterday/today/last 7 days".
  const cairoStart = cairoFromParts(
    f.getFullYear(),
    f.getMonth() + 1,
    f.getDate(),
    0,
    0,
    0,
  );
  const cairoEnd = cairoFromParts(
    t.getFullYear(),
    t.getMonth() + 1,
    t.getDate(),
    23,
    59,
    59,
    999,
  );
  return { from: cairoStart, to: cairoEnd };
}

/** Default range = today in Cairo. */
export function defaultCairoTodayRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: cairoStartOfDay(now), to: cairoEndOfDay(now) };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function EtitHistoryControls({
  vehicle,
  history,
  summary,
  range,
  onRangeChange,
  onLoad,
  loading,
  className,
}: EtitHistoryControlsProps) {
  const { t } = useTranslation();
  const pickerStrings = React.useMemo(() => rangeToPickerStrings(range), [range]);

  const handlePickerChange = (from: string | null, to: string | null) => {
    const next = pickerStringsToRange(from, to, range);
    onRangeChange(next);
  };

  const fromLabel = formatCairo(range.from, 'datetime');
  const toLabel = formatCairo(range.to, 'datetime');

  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
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
          onClick={onLoad}
          disabled={!vehicle || loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t('etit.controls.loadHistory')}
        </Button>
      </div>

      {/* Date range — picker emits local-day boundaries which we re-anchor to Cairo */}
      <div className="mb-2">
        <DateRangePicker
          from={pickerStrings.from}
          to={pickerStrings.to}
          onChange={handlePickerChange}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>
          <span className="font-medium text-foreground">{fromLabel}</span>
          <span className="mx-1.5">→</span>
          <span className="font-medium text-foreground">{toLabel}</span>
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{t('etit.controls.cairoTime')}</span>
      </div>

      {/* Stats strip */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)
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
            <Stat
              icon={<Fuel className="h-3.5 w-3.5" />}
              label={t('etit.controls.stats.fuel')}
              value={summary.totalFuelConsumption || '—'}
            />
          </>
        ) : (
          <>
            <PlaceholderStat label={t('etit.controls.stats.mileage')} />
            <PlaceholderStat label={t('etit.controls.stats.activeTime')} />
            <PlaceholderStat label={t('etit.controls.stats.stops')} />
            <PlaceholderStat label={t('etit.controls.stats.fuel')} />
          </>
        )}
      </div>

      {/* Driver / counts */}
      {summary && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {summary.driverName || t('etit.controls.unassignedDriver')}
          </span>
          {summary.ignitionOnCount && (
            <span>
              {t('etit.controls.ignitionOn')}: {summary.ignitionOnCount}
            </span>
          )}
          {summary.ignitionOffCount && (
            <span>
              {t('etit.controls.ignitionOff')}: {summary.ignitionOffCount}
            </span>
          )}
          {summary.totalIdleTime && summary.totalIdleTime !== '00:00:00' && (
            <span>
              {t('etit.controls.idle')}: {summary.totalIdleTime}
            </span>
          )}
          {summary.totalDisconnectedTime && summary.totalDisconnectedTime !== '00:00:00' && (
            <span>
              {t('etit.controls.disconnected')}: {summary.totalDisconnectedTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat boxes                                                                  */
/* -------------------------------------------------------------------------- */

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PlaceholderStat({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/10 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-muted-foreground/50">—</div>
    </div>
  );
}
