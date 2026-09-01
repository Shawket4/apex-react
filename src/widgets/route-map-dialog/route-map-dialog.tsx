import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ExternalLink, Loader2, MapPin, Navigation, RefreshCw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';
import {
  asValidCoord,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from '@/shared/lib/coords';
import { MapView } from '@/shared/ui/map-view';
import type { MapMarker } from '@/shared/lib/maps/types';

/* -------------------------------------------------------------------------- */
/* One route on a map                                                          */
/*                                                                            */
/* The presentation only. Callers resolve their own data and hand over a       */
/* terminal, a drop-off, a polyline and a row of facts — so a trip and a fee   */
/* mapping show the same thing rather than two dialogs that drift.             */
/*                                                                            */
/* Coordinate state matrix, which is the whole reason this is fiddly:          */
/*   both valid → markers + route, and a directions link                       */
/*   one valid  → that marker only, route SUPPRESSED. A line drawn to an       */
/*                unpinned end is a line to (0, 0) in the Gulf of Guinea       */
/*   none valid → an empty state; the caller decides whether to even open      */
/* -------------------------------------------------------------------------- */

export interface RouteFact {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** `money` for a fee, `bad` for a figure that is out of line. */
  tone?: 'money' | 'bad';
}

export interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  facts?: RouteFact[];
  /** Either end may be absent or unpinned; the dialog handles all four cases. */
  terminal?: { lat?: number | null; lng?: number | null } | null;
  dropoff?: { lat?: number | null; lng?: number | null } | null;
  /** Decoded polyline. Empty renders markers only. */
  route?: [number, number][];
  terminalLabel?: string;
  dropoffLabel?: string;
  /** Optional marker popups; callers that want richer content supply HTML. */
  terminalPopupHtml?: string;
  dropoffPopupHtml?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Shown when neither end is pinned. */
  emptyTitle?: string;
}

export function RouteMapDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  facts = [],
  terminal,
  dropoff,
  route = [],
  terminalLabel,
  dropoffLabel,
  terminalPopupHtml,
  dropoffPopupHtml,
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle,
}: RouteMapDialogProps) {
  const { t } = useTranslation();

  const terminalCoord = asValidCoord(terminal?.lat, terminal?.lng);
  const dropoffCoord = asValidCoord(dropoff?.lat, dropoff?.lng);
  const bothValid = terminalCoord !== null && dropoffCoord !== null;
  const oneValid = (terminalCoord === null) !== (dropoffCoord === null);
  const noneValid = !terminalCoord && !dropoffCoord;

  const tLabel = terminalLabel ?? t('trips.location.terminal');
  const dLabel = dropoffLabel ?? t('trips.location.dropOff');

  const markers = React.useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (terminalCoord) {
      out.push({
        id: 'terminal',
        lat: terminalCoord[0],
        lng: terminalCoord[1],
        color: '#16A34A',
        title: tLabel,
        popupHtml: terminalPopupHtml,
      });
    }
    if (dropoffCoord) {
      out.push({
        id: 'dropoff',
        lat: dropoffCoord[0],
        lng: dropoffCoord[1],
        color: '#DC2626',
        title: dLabel,
        popupHtml: dropoffPopupHtml,
      });
    }
    return out;
  }, [terminalCoord, dropoffCoord, tLabel, dLabel, terminalPopupHtml, dropoffPopupHtml]);

  const terminalUrl = terminalCoord ? googleMapsSearchUrl(terminalCoord[0], terminalCoord[1]) : null;
  const dropoffUrl = dropoffCoord ? googleMapsSearchUrl(dropoffCoord[0], dropoffCoord[1]) : null;
  const directionsUrl = googleMapsDirectionsUrl(terminalCoord, dropoffCoord);

  const showMap = !isLoading && !isError && !noneValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Near-full-height on a phone, a panel on a desktop. The old fixed
          max-h-[90vh] left the map squeezed between header and footer on a
          short screen. */}
      <DialogContent
        className="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col
                   gap-0 overflow-hidden p-0 sm:h-auto"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 text-start sm:px-6 sm:py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="truncate text-xs sm:text-sm">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          {isLoading ? (
            <FactsSkeleton />
          ) : facts.length > 0 ? (
            /* A fixed grid, not a wrap: two up on a phone, four on a desktop,
               so the values line up down the column instead of reflowing by
               how many digits each happens to have. */
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border bg-card p-3 sm:grid-cols-4">
              {facts.map((f, i) => (
                <Fact key={i} {...f} />
              ))}
            </dl>
          ) : null}

          {showMap && oneValid && (
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold">{t('trips.location.partialRoute.title')}</p>
                <p className="text-muted-foreground">
                  {terminalCoord
                    ? t('trips.location.partialRoute.missingDropoff')
                    : t('trips.location.partialRoute.missingTerminal')}
                </p>
              </div>
            </div>
          )}

          {/* Grows with the screen rather than sitting at a fixed 380px, which
              on a phone left the map a letterbox under the facts. */}
          <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-lg border bg-muted/40 sm:h-[380px] sm:min-h-0 sm:flex-none">
            {isLoading && <MapLoading />}
            {isError && (
              <MapError message={t('trips.location.loadFailed')} onRetry={onRetry} />
            )}

            {showMap ? (
              <MapView
                markers={markers}
                route={route}
                suppressRoute={oneValid}
                className="h-full w-full"
                centerFallback={terminalCoord || dropoffCoord || undefined}
              />
            ) : (
              !isLoading &&
              !isError && (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    lottieSrc="/animations/location_radar.lottie"
                    lottieWidth={100}
                    lottieHeight={100}
                    title={emptyTitle ?? t('trips.dialog.map.noCoordinates')}
                    className="border-0 bg-transparent py-4 shadow-none"
                  />
                </div>
              )
            )}

            {showMap && markers.length > 0 && (
              <div className="absolute bottom-2 start-2 z-[1000] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background/90 px-2.5 py-1.5 backdrop-blur-sm sm:bottom-3 sm:start-3">
                {terminalCoord && <LegendDot color="#16A34A" label={tLabel} />}
                {dropoffCoord && <LegendDot color="#DC2626" label={dLabel} />}
                {route.length > 0 && bothValid && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-0.5 w-4 rounded-full bg-blue-500" />
                    {t('trips.location.route')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions stack full-width on a phone — three side-by-side buttons at
            360px were unhittable. */}
        <div className="shrink-0 border-t px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {terminalUrl && (
                <LinkButton href={terminalUrl} icon={<ExternalLink />}>
                  {t('trips.location.openTerminal')}
                </LinkButton>
              )}
              {dropoffUrl && (
                <LinkButton href={dropoffUrl} icon={<ExternalLink />}>
                  {t('trips.location.openDropoff')}
                </LinkButton>
              )}
              {directionsUrl && (
                <LinkButton href={directionsUrl} icon={<Navigation />} primary>
                  {t('trips.location.openRoute')}
                </LinkButton>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full text-xs sm:h-8 sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkButton({
  href,
  icon,
  primary,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      asChild
      variant={primary ? 'default' : 'outline'}
      size="sm"
      className="h-9 w-full gap-1.5 text-xs sm:h-8 sm:w-auto"
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        {icon}
        {children}
      </a>
    </Button>
  );
}

function Fact({ icon, label, value, tone }: RouteFact) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          'mt-0.5 truncate font-mono text-[13px] tabular-nums',
          tone === 'money' && 'font-semibold text-money',
          tone === 'bad' && 'font-semibold text-destructive',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function FactsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border bg-card p-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function MapLoading() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background/60 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {/* Deliberately no text key: the spinner is the message. */}
    </div>
  );
}

function MapError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 px-4 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          {String(message) && 'Retry'}
        </Button>
      )}
    </div>
  );
}
