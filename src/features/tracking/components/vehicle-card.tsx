import { useTranslation } from 'react-i18next';
import { Crosshair, History, X } from 'lucide-react';
import { STATUS_COLOR, type LiveStatus, type Vehicle } from '../schemas';
import { groupOf } from './status-chips';

/* -------------------------------------------------------------------------- */
/* The selected vehicle's floating card (live mode): identity, live status,   */
/* and the two actions that matter — focus and replay.                        */
/* -------------------------------------------------------------------------- */

const tsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  hour12: false,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function VehicleCard({
  vehicle,
  live,
  onFocus,
  onReplay,
  onClose,
}: {
  vehicle: Vehicle;
  live: LiveStatus | null;
  onFocus: () => void;
  onReplay: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const group = groupOf(vehicle, live);
  const ts = live?.timestamp ?? vehicle.lastLocationAt;

  return (
    <div className="pointer-events-auto w-[260px] rounded-xl border bg-card/95 p-3 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: STATUS_COLOR[group] }}
            />
            <span className="font-mono text-lg font-bold tabular-nums">
              {vehicle.plate.replace(/\D/g, '') || vehicle.plate}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {vehicle.plate.split(/\s+/).filter((w) => !/^\d+$/.test(w)).join(' ')}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {live?.statusLabel ?? vehicle.statusLabel}
            {(live?.speed ?? 0) > 0 && (
              <span className="tabular-nums"> · {live!.speed} {t('tracking.kmh', 'km/h')}</span>
            )}
          </p>
          {ts && (
            <p className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">
              {tsFmt.format(ts)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={onFocus}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border bg-background text-xs font-medium hover:bg-muted"
        >
          <Crosshair className="h-3.5 w-3.5" />
          {t('tracking.focus', 'Focus')}
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90"
        >
          <History className="h-3.5 w-3.5" />
          {t('tracking.replay', 'Replay')}
        </button>
      </div>
    </div>
  );
}
