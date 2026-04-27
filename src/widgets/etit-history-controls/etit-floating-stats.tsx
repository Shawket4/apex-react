import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Gauge, MapPin, Pause, Zap, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { EtitTripSummary } from '@/entities/etit-vehicle/schemas';

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
    <div className={cn(
      "pointer-events-auto flex flex-col gap-3 bg-background/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-4 transition-all hover:bg-background/60",
      className
    )}>
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-2">
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

      {/* Driver Info */}
      {summary?.driverName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10">
          <User className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-bold text-foreground truncate uppercase">{summary.driverName}</span>
        </div>
      )}

      {/* Overlays Toggles */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
          {t('etit.controls.overlays')}
        </span>
        <div className="flex flex-wrap gap-2">
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
    <div className="group flex flex-col rounded-xl border bg-background/20 p-3 transition-all hover:bg-background/40">
      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
        <div className="rounded-md bg-primary/10 p-1 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-sm font-black tracking-tight text-foreground">{value}</div>
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
      ? 'data-[active=true]:border-purple-500/50 data-[active=true]:bg-purple-500/10 data-[active=true]:text-purple-300'
      : 'data-[active=true]:border-cyan-500/50 data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-300';

  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[10px] font-bold uppercase transition-all',
        'border-transparent bg-white/5 text-muted-foreground hover:bg-white/10',
        colorRing,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
