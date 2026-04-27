import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { EtitDateTimeRange } from '@/widgets/etit-datetime-range/etit-datetime-range';
import type { EtitVehicle } from '@/entities/etit-vehicle/schemas';

interface EtitVehicleHistorySelectorProps {
  vehicle: EtitVehicle;
  range: { from: Date; to: Date };
  onRangeChange: (range: { from: Date; to: Date }) => void;
  onLoad: (refresh?: boolean) => void;
  onBack: () => void;
  onClearHistory?: () => void;
  isHistoryLoaded?: boolean;
  loading?: boolean;
  className?: string;
}

export function EtitVehicleHistorySelector({
  vehicle,
  range,
  onRangeChange,
  onLoad,
  onBack,
  onClearHistory,
  isHistoryLoaded,
  loading,
  className,
}: EtitVehicleHistorySelectorProps) {
  const { t } = useTranslation();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);

  const handlePointerDown = React.useCallback(() => {
    setIsRefreshing(false);
    const timer = setTimeout(() => {
      setIsRefreshing(true);
      onLoad(true);
      setLongPressTimer(null);
    }, 700);
    setLongPressTimer(timer);
  }, [onLoad]);

  const handlePointerUp = React.useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      if (!isRefreshing) {
        onLoad(false);
      }
    }
  }, [longPressTimer, onLoad, isRefreshing]);

  // Reset local refreshing state when parent loading starts/ends
  React.useEffect(() => {
    if (loading) setIsRefreshing(false);
  }, [loading]);

  return (
    <div className={cn('flex h-full flex-col bg-card', className)}>
      <div className="flex h-14 items-center gap-2 border-b px-4 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight">
            {vehicle.plate || vehicle.codename}
          </h2>
          <p className="truncate text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            {vehicle.statusLabel}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            {t('etit.range.period')}
          </label>
          <EtitDateTimeRange value={range} onChange={onRangeChange} />
        </div>

        <Button
          size="lg"
          className="w-full gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => longPressTimer && clearTimeout(longPressTimer)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          )}
          {t('etit.controls.loadHistory')}
        </Button>

        {isHistoryLoaded && (
          <Button
            variant="outline"
            className="w-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-all"
            onClick={onClearHistory}
            disabled={loading}
          >
            {t('common.exit')}
          </Button>
        )}

        <div className="rounded-lg bg-muted/30 p-3 border border-dashed border-border/50">
          <p className="text-[10px] leading-relaxed text-muted-foreground italic">
            {t('etit.controls.loadHistoryHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
