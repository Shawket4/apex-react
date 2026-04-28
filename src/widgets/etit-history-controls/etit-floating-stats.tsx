import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Gauge, MapPin, Pause, User, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { EtitTripSummary } from '@/entities/etit-vehicle/schemas';

/* -------------------------------------------------------------------------- */
/* Floating Stats                                                              */
/*                                                                             */
/* Theme-aware: previously hardcoded `bg-slate-950/90`, `text-white` etc      */
/* which made the panel an opaque black-on-white slab in light mode. Now     */
/* uses `bg-card`/`text-foreground` so it follows the global theme toggle.   */
/*                                                                             */
/* Sizing: clamps to a sensible width range so it stays "molded" into the   */
/* corner instead of stretching with content.                                */
/* -------------------------------------------------------------------------- */

interface EtitFloatingStatsProps {
  summary: EtitTripSummary | null;
  showStops: boolean;
  onShowStopsChange: (next: boolean) => void;
  showIgnitions: boolean;
  onShowIgnitionsChange: (next: boolean) => void;
  className?: string;
}

export function EtitFloatingStats({
  summary,
  showStops,
  onShowStopsChange,
  showIgnitions,
  onShowIgnitionsChange,
  className,
}: EtitFloatingStatsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'pointer-events-auto flex flex-col gap-2.5 p-3 transition-all',
        'min-w-[240px] max-w-[280px]',
        'bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl',
        'border border-border/60 hover:border-border',
        // Subtle inner glow for that "molded" feel.
        'ring-1 ring-inset ring-foreground/5',
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-1.5">
        {summary ? (
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
          <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {t('common.loading')}
          </div>
        )}
      </div>

      {summary?.driverName && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-primary/5 rounded-xl border border-primary/10">
          <User className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[10px] font-bold text-foreground truncate uppercase tracking-tight">
            {summary.driverName}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
          {t('etit.controls.overlays')}
        </span>
        <div className="flex flex-wrap gap-1.5">
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
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/30 p-2 transition-all hover:bg-muted/50 hover:border-border">
      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight min-w-0">
        <div className="text-primary group-hover:scale-110 transition-transform shrink-0">
          {icon}
        </div>
        <span className="truncate">{label}</span>
      </div>
      <div className="truncate text-xs font-black tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

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
      data-no-drag
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold uppercase transition-all',
        'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
        colorRing,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
