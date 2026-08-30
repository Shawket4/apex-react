import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, History, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { STATUS_COLOR, type LiveStatus, type Vehicle } from '../schemas';
import { groupOf } from './status-chips';

/* -------------------------------------------------------------------------- */
/* The selected vehicle's floating card (live mode): identity, live status,   */
/* and the two actions that matter — focus and replay.                        */
/* -------------------------------------------------------------------------- */

const makeTsFmt = (locale: string) =>
  new Intl.DateTimeFormat(locale, {
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB';
  const tsFmt = React.useMemo(() => makeTsFmt(locale), [locale]);
  const group = groupOf(vehicle, live);
  const ts = live?.timestamp ?? vehicle.lastLocationAt;

  return (
    <div className="pointer-events-auto w-[260px] rounded-lg border bg-card/95 p-3 shadow-md backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: STATUS_COLOR[group] }}
            />
            <span className="font-mono text-[17px] font-semibold leading-tight tabular-nums">
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
            <p className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
              {tsFmt.format(ts)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFocus}
          className="flex-1 gap-1.5"
        >
          <Crosshair aria-hidden="true" />
          {t('tracking.focus', 'Focus')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onReplay}
          className="flex-1 gap-1.5"
        >
          <History aria-hidden="true" />
          {t('tracking.replay', 'Replay')}
        </Button>
      </div>
    </div>
  );
}
