import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Moon, Play } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { formatCairoTime } from '@/shared/lib/cairo';
import { legColor, type ReplayModel } from '@/pages/trip-replay/replay-model';

/* -------------------------------------------------------------------------- */
/* TripReplayLegRail — collapsible left rail, one card per leg.                */
/* Active leg follows playback (page passes activeIndex from the 4Hz frame).  */
/* -------------------------------------------------------------------------- */

export interface TripReplayLegRailProps {
  model: ReplayModel;
  /** Index into model.timedLegs, or -1. */
  activeIndex: number;
  disabled?: boolean;
  /** Card click: camera fits the leg + playhead to its start. */
  onLegClick: (index: number) => void;
  /** Mini play button: loop just that leg. */
  onLoopLeg: (index: number) => void;
  className?: string;
}

export function TripReplayLegRail({
  model,
  activeIndex,
  disabled = false,
  onLegClick,
  onLoopLeg,
  className,
}: TripReplayLegRailProps) {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = React.useState(false);
  const activeRef = React.useRef<HTMLLIElement>(null);

  // Keep the active card in view as playback advances between legs.
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  if (collapsed) {
    return (
      <div
        className={cn('pointer-events-auto', className)}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/85 shadow-lg backdrop-blur-md"
          onClick={() => setCollapsed(false)}
          title={t('tripReplay.legRail.expand', 'Show legs')}
          aria-label={t('tripReplay.legRail.expand', 'Show legs')}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>
    );
  }

  return (
    // Gestures (drag/scroll/wheel) that start on the rail must never reach
    // the map behind it.
    <div
      className={cn(
        'pointer-events-auto flex max-h-full w-72 flex-col overflow-hidden rounded-lg border bg-card/85 shadow-lg backdrop-blur-md',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('tripReplay.legRail.title', 'Legs')}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-6 w-6 text-muted-foreground after:absolute after:-inset-2 after:content-['']"
          onClick={() => setCollapsed(true)}
          title={t('tripReplay.legRail.collapse', 'Hide legs')}
          aria-label={t('tripReplay.legRail.collapse', 'Hide legs')}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2">
        {model.timedLegs.map((leg, i) => {
          const active = i === activeIndex;
          const excessKm =
            leg.actualKm != null && leg.osrmKm != null
              ? leg.actualKm - leg.osrmKm
              : null;
          return (
            <li key={leg.id} ref={active ? activeRef : undefined}>
              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && onLegClick(i)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onLegClick(i);
                  }
                }}
                className={cn(
                  'w-full cursor-pointer rounded-lg border p-2 text-start transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted/50',
                  disabled && 'pointer-events-none opacity-50',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: legColor(leg.legType) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold" dir="auto">
                    {leg.fromName || '—'} → {leg.toName || '—'}
                  </span>
                  {leg.night && (
                    <Moon
                      className="h-3 w-3 shrink-0 text-primary"
                      role="img"
                      aria-label={t('tripReplay.legRail.night', 'Night window')}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative h-6 w-6 shrink-0 text-muted-foreground after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoopLeg(i);
                    }}
                    title={t('tripReplay.legRail.loop', 'Loop this leg')}
                    aria-label={t('tripReplay.legRail.loop', 'Loop this leg')}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>

                <div
                  className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground"
                  dir="ltr"
                >
                  {formatCairoTime(new Date(leg.departMs!), i18n.language)} →{' '}
                  {formatCairoTime(new Date(leg.arriveMs!), i18n.language)}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
                  <span className="font-mono" dir="ltr">
                    {leg.actualKm != null ? leg.actualKm.toFixed(1) : '—'} /{' '}
                    {leg.osrmKm != null ? leg.osrmKm.toFixed(1) : '—'}{' '}
                    {t('tripReplay.legRail.km', 'km')}
                  </span>
                  {excessKm != null && excessKm > 0.05 && (
                    <Badge variant="warning" className="shrink-0" dir="ltr">
                      +{excessKm.toFixed(1)} {t('tripReplay.legRail.km', 'km')}
                    </Badge>
                  )}
                  {leg.offRoutePct != null && (
                    <span dir="ltr">
                      {t('tripReplay.legRail.offRoute', '{{pct}}% off-route', {
                        pct: leg.offRoutePct.toFixed(0),
                      })}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
