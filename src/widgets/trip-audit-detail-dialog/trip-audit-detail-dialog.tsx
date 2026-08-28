import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  Moon,
  Play,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { MapView } from '@/shared/ui/map-view';
import type { MapCircle, MapMarker, MapPolyline } from '@/shared/lib/maps/types';
import { decodePolyline5 } from '@/shared/lib/polyline';
import { isValidCoordinate } from '@/shared/lib/coords';
import { normalize } from '@/shared/lib/normalize';
import { cn } from '@/shared/lib/cn';
import { formatCairoDateTime, formatCairoDay, formatCairoTime } from '@/shared/lib/cairo';
import { formatNumber } from '@/shared/lib/format';
import { useReviewMatch, useTripMatch } from '@/entities/trip-audit/queries';
import {
  parseFlagDetails,
  KNOWN_FLAG_TYPES,
  type FlagSeverity,
  type TripFlag,
  type TripLeg,
  type TripMatchDetail,
} from '@/entities/trip-audit/schemas';
import { useEtitHistoryDay } from '@/entities/etit-vehicle/queries';
import type {
  EtitHistoryPoint,
  EtitSensorEvent,
  EtitStop,
} from '@/entities/etit-vehicle/schemas';
import type { PlaybackState } from '@/entities/etit-vehicle/playback';
import { EtitPlaybackPlayer } from '@/widgets/etit-playback-player/etit-playback-player';
import { locationApi } from '@/entities/location/api';
import { useTerminals } from '@/entities/location/queries';
import {
  DROPOFF_DEFAULT_RADIUS_M,
  TERMINAL_DEFAULT_RADIUS_M,
} from '@/entities/location/schemas';
import {
  formatDurationSecs,
  formatKm,
  RatioBadge,
  useUnmatchedReasonLabel,
} from '@/widgets/trip-audit-matches-table';

/* -------------------------------------------------------------------------- */
/* Colors + constants                                                          */
/* -------------------------------------------------------------------------- */

const ACTUAL_COLOR = '#3b82f6'; // blue — GPS trace
const OSRM_COLOR = '#16a34a'; // green dashed — OSRM optimal
const STOP_COLOR = '#f59e0b'; // amber — unplanned stop markers
const GEOFENCE_COLOR = '#8b5cf6'; // violet — terminal / drop-off geofences
const PLAYBACK_NORMAL = '#2563eb';
const PLAYBACK_SPEEDING = '#dc2626';

/** Window padding around [start_ts, end_ts] for the playback trace. */
const PLAYBACK_PAD_MS = 15 * 60_000;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

interface UnplannedStop {
  flagId: number;
  lat: number;
  lng: number;
  durationSecs: number | null;
  address: string | null;
}

function extractUnplannedStops(flags: TripFlag[]): UnplannedStop[] {
  const out: UnplannedStop[] = [];
  for (const flag of flags) {
    if (flag.flag_type !== 'unplanned_stop') continue;
    const details = parseFlagDetails(flag);
    const lat = asNumber(details.lat);
    const lng = asNumber(details.lng);
    if (lat == null || lng == null) continue;
    out.push({
      flagId: flag.id,
      lat,
      lng,
      durationSecs: asNumber(details.duration_secs),
      address: asString(details.address),
    });
  }
  return out;
}

const SEVERITY_ICON: Record<FlagSeverity, React.ReactNode> = {
  info: <Info className="h-4 w-4 shrink-0 text-primary" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />,
  critical: <CircleAlert className="h-4 w-4 shrink-0 text-destructive" />,
};

const SEVERITY_VARIANT: Record<FlagSeverity, 'secondary' | 'warning' | 'destructive'> = {
  info: 'secondary',
  warning: 'warning',
  critical: 'destructive',
};

const STATUS_VARIANT: Record<'matched' | 'partial' | 'unmatched', 'success' | 'warning' | 'destructive'> = {
  matched: 'success',
  partial: 'warning',
  unmatched: 'destructive',
};

/* -------------------------------------------------------------------------- */
/* Vehicle history for playback                                                */
/*                                                                             */
/* Same endpoint live tracking uses (`GET /vehicles/:id/history?date=...`).   */
/* The trip window [start_ts−15m, end_ts+15m] decides which Cairo day(s) to   */
/* fetch — a window crossing midnight fetches both days and concatenates.     */
/* Any failure degrades to the stored leg geometries (no scrubber).           */
/* -------------------------------------------------------------------------- */

interface PlaybackHistory {
  points: EtitHistoryPoint[];
  stops: EtitStop[];
  sensors: EtitSensorEvent[];
  loading: boolean;
  /** True when history can't drive a scrubber (no window, error, <2 points). */
  unavailable: boolean;
}

function useTripPlaybackHistory(detail: TripMatchDetail | null, open: boolean): PlaybackHistory {
  const window = React.useMemo(() => {
    if (!detail?.vehicle_id || !detail.start_ts || !detail.end_ts) return null;
    const start = Date.parse(detail.start_ts);
    const end = Date.parse(detail.end_ts);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
    return {
      vehicleId: detail.vehicle_id,
      startMs: start - PLAYBACK_PAD_MS,
      endMs: end + PLAYBACK_PAD_MS,
    };
  }, [detail]);

  const startDay = React.useMemo(
    () => (window ? new Date(window.startMs) : null),
    [window],
  );
  const endDay = React.useMemo(() => (window ? new Date(window.endMs) : null), [window]);

  // Compare Cairo calendar days, not browser-local ones — the proxy resolves
  // `date=` in its own timezone.
  const crossesMidnight =
    startDay != null &&
    endDay != null &&
    formatCairoDayKeyOf(startDay) !== formatCairoDayKeyOf(endDay);

  const firstQuery = useEtitHistoryDay(
    open && window && startDay ? { vehicleId: window.vehicleId, day: startDay } : null,
  );
  const secondQuery = useEtitHistoryDay(
    open && window && crossesMidnight && endDay
      ? { vehicleId: window.vehicleId, day: endDay }
      : null,
  );

  return React.useMemo(() => {
    if (!window) {
      return { points: [], stops: [], sensors: [], loading: false, unavailable: true };
    }
    const loading = firstQuery.isLoading || (crossesMidnight && secondQuery.isLoading);
    const responses = [firstQuery.data, crossesMidnight ? secondQuery.data : undefined].filter(
      (r): r is NonNullable<typeof r> => r != null,
    );

    // Concatenate + de-duplicate by timestamp, then clamp to the trip window.
    const byMs = new Map<number, EtitHistoryPoint>();
    for (const res of responses) {
      for (const p of res.points) {
        const ms = p.timestamp?.getTime();
        if (ms == null || !Number.isFinite(ms)) continue;
        if (ms < window.startMs || ms > window.endMs) continue;
        byMs.set(ms, p);
      }
    }
    const points = [...byMs.values()].sort(
      (a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0),
    );

    const stops = responses
      .flatMap((r) => r.stops)
      .filter((s) => s.to.getTime() >= window.startMs && s.from.getTime() <= window.endMs);
    const sensors = responses
      .flatMap((r) => r.sensors)
      .filter(
        (s) =>
          s.timestamp.getTime() >= window.startMs && s.timestamp.getTime() <= window.endMs,
      );

    return {
      points,
      stops,
      sensors,
      loading,
      unavailable: !loading && points.length < 2,
    };
  }, [window, crossesMidnight, firstQuery.isLoading, firstQuery.data, secondQuery.isLoading, secondQuery.data]);
}

/** Cairo 'YYYY-MM-DD' of an instant (local midnight boundaries are Cairo's). */
function formatCairoDayKeyOf(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts;
}

/* -------------------------------------------------------------------------- */
/* Geofence resolution                                                         */
/*                                                                             */
/* Circles for the trip's terminal + drop-offs, resolved by matching leg      */
/* endpoint names against the terminals list and a targeted drop-off search.  */
/* Anything unresolvable is silently skipped.                                  */
/* -------------------------------------------------------------------------- */

interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

function useTripGeofences(detail: TripMatchDetail | null, open: boolean): Geofence[] {
  const names = React.useMemo(() => {
    if (!detail) return [];
    const set = new Map<string, string>();
    const add = (name: string) => {
      const trimmed = name.trim();
      if (trimmed) set.set(normalize(trimmed), trimmed);
    };
    add(detail.terminal_name);
    for (const leg of detail.legs) {
      add(leg.from_name);
      add(leg.to_name);
    }
    return [...set.values()];
  }, [detail]);

  const terminalsQuery = useTerminals(undefined, { enabled: open && names.length > 0 });
  const terminals = React.useMemo(
    () => terminalsQuery.data ?? [],
    [terminalsQuery.data],
  );
  const terminalsSettled = terminalsQuery.isSuccess || terminalsQuery.isError;

  const terminalByName = React.useMemo(() => {
    const map = new Map<string, (typeof terminals)[number]>();
    for (const term of terminals) map.set(normalize(term.name), term);
    return map;
  }, [terminals]);

  const dropoffNames = React.useMemo(
    () => names.filter((n) => !terminalByName.has(normalize(n))),
    [names, terminalByName],
  );

  const dropoffsQuery = useQuery({
    queryKey: ['trip-audit', 'geofence-dropoffs', detail?.id ?? 0, dropoffNames],
    queryFn: async () => {
      const pages = await Promise.all(
        dropoffNames.map((name) => locationApi.listDropoffs({ q: name, per_page: 5 })),
      );
      return pages.flatMap((p) => p.items);
    },
    // Wait for the terminals list to settle so terminal names are excluded
    // before we run per-name drop-off searches.
    enabled: open && terminalsSettled && dropoffNames.length > 0,
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const dropoffs = dropoffsQuery.data;
  return React.useMemo(() => {
    const out: Geofence[] = [];
    const seen = new Set<string>();
    const dropoffByName = new Map<string, NonNullable<typeof dropoffs>[number]>();
    for (const d of dropoffs ?? []) dropoffByName.set(normalize(d.name), d);

    for (const name of names) {
      const key = normalize(name);
      if (seen.has(key)) continue;
      const terminal = terminalByName.get(key);
      if (terminal && isValidCoordinate(terminal.lat, terminal.long)) {
        seen.add(key);
        out.push({
          id: `terminal-${terminal.ID}`,
          name: terminal.name,
          lat: terminal.lat as number,
          lng: terminal.long as number,
          radiusM: terminal.radius_m ?? TERMINAL_DEFAULT_RADIUS_M,
        });
        continue;
      }
      const dropoff = dropoffByName.get(key);
      if (dropoff && isValidCoordinate(dropoff.lat, dropoff.long)) {
        seen.add(key);
        out.push({
          id: `dropoff-${dropoff.ID}`,
          name: dropoff.name,
          lat: dropoff.lat as number,
          lng: dropoff.long as number,
          radiusM: dropoff.radius_m ?? DROPOFF_DEFAULT_RADIUS_M,
        });
      }
    }
    return out;
  }, [names, terminalByName, dropoffs]);
}

/* -------------------------------------------------------------------------- */
/* Layer toggle chip                                                           */
/* -------------------------------------------------------------------------- */

function LayerChip({
  active,
  onClick,
  label,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  swatch: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary/50 bg-primary/5 text-foreground'
          : 'border-border bg-card text-muted-foreground opacity-60 hover:opacity-100',
      )}
    >
      {swatch}
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Map section — playback-first                                                */
/* -------------------------------------------------------------------------- */

interface PlaybackMapProps {
  detail: TripMatchDetail;
  history: PlaybackHistory;
}

function PlaybackMap({ detail, history }: PlaybackMapProps) {
  const { t } = useTranslation();

  /* ---- Layer toggles (component state only) ---- */
  const [showActual, setShowActual] = React.useState(true);
  const [showOsrm, setShowOsrm] = React.useState(true);
  const [showFlags, setShowFlags] = React.useState(true);
  const [showGeofences, setShowGeofences] = React.useState(true);

  const geofences = useTripGeofences(detail, true);

  /* ---- Playback state ---- */
  const [currentMs, setCurrentMs] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(16);
  const [playbackState, setPlaybackState] = React.useState<PlaybackState | null>(null);
  const [playbackPrev, setPlaybackPrev] =
    React.useState<{ lat: number; lng: number } | null>(null);

  const playable = history.points.length >= 2;

  // Reset the scrubber whenever a different trip's history arrives.
  const seededKey = React.useRef<string>('');
  React.useEffect(() => {
    const key = `${detail.id}:${history.points.length}`;
    if (seededKey.current === key) return;
    seededKey.current = key;
    setPlaying(false);
    setPlaybackState(null);
    setPlaybackPrev(null);
    const first = history.points[0]?.timestamp?.getTime();
    setCurrentMs(first ?? 0);
  }, [detail.id, history.points]);

  const handlePlaybackChange = React.useCallback(
    (state: PlaybackState | null, prev: { lat: number; lng: number } | null) => {
      setPlaybackState(state);
      setPlaybackPrev(prev);
    },
    [],
  );

  /* ---- Map layers ---- */

  const sortedLegs = React.useMemo(
    () => [...detail.legs].sort((a, b) => a.seq - b.seq),
    [detail.legs],
  );

  // Static layers only — the moving playback marker is appended in a second,
  // cheap memo so polyline decoding doesn't re-run ~30×/s during playback.
  const { polylines, staticMarkers, circles } = React.useMemo(() => {
    const lines: MapPolyline[] = [];
    const pins: MapMarker[] = [];
    const rings: MapCircle[] = [];

    /* Actual route — the live GPS trace when available, else the stored
       per-leg geometries (the "never a broken map" fallback). */
    if (showActual) {
      if (playable) {
        lines.push({
          id: 'history-actual',
          path: history.points.map((p) => [p.lat, p.lng] as [number, number]),
          color: ACTUAL_COLOR,
          weight: 4,
          opacity: 0.9,
        });
      } else {
        sortedLegs.forEach((leg) => {
          const actual = decodePolyline5(leg.actual_geometry);
          if (actual.length > 1) {
            lines.push({
              id: `leg-${leg.id}-actual`,
              path: actual,
              color: ACTUAL_COLOR,
              weight: 4,
              opacity: 0.9,
            });
          }
        });
      }
    }

    /* OSRM optimal — per-leg dashed green. */
    if (showOsrm) {
      sortedLegs.forEach((leg) => {
        const osrm = decodePolyline5(leg.osrm_geometry); // '' decodes to []
        if (osrm.length > 1) {
          lines.push({
            id: `leg-${leg.id}-osrm`,
            path: osrm,
            color: OSRM_COLOR,
            weight: 3,
            opacity: 0.9,
            dashed: true,
          });
        }
      });
    }

    /* Leg endpoint pins — always on; they anchor the route story. */
    sortedLegs.forEach((leg, i) => {
      const actual = decodePolyline5(leg.actual_geometry);
      const osrm = decodePolyline5(leg.osrm_geometry);
      const path = actual.length > 0 ? actual : osrm;
      if (path.length === 0) return;
      if (i === 0) {
        pins.push({
          id: `leg-${leg.id}-start`,
          lat: path[0][0],
          lng: path[0][1],
          color: '#16a34a',
          kind: 'route-start',
          title: leg.from_name || undefined,
        });
      }
      const end = path[path.length - 1];
      pins.push({
        id: `leg-${leg.id}-end`,
        lat: end[0],
        lng: end[1],
        color: i === sortedLegs.length - 1 ? '#dc2626' : '#64748b',
        kind: i === sortedLegs.length - 1 ? 'route-end' : 'pin',
        title: leg.to_name || undefined,
      });
    });

    /* Stops & flags. */
    if (showFlags) {
      for (const stop of extractUnplannedStops(detail.flags)) {
        pins.push({
          id: `stop-${stop.flagId}`,
          lat: stop.lat,
          lng: stop.lng,
          color: STOP_COLOR,
          kind: 'stop',
          title: [
            t('tripAudit.flagTypes.unplanned_stop', 'Unplanned stop'),
            stop.durationSecs != null ? formatDurationSecs(stop.durationSecs) : null,
            stop.address,
          ]
            .filter(Boolean)
            .join(' · '),
        });
      }
    }

    /* Geofences — terminal + drop-off radius circles. */
    if (showGeofences) {
      for (const g of geofences) {
        rings.push({
          id: `geofence-${g.id}`,
          lat: g.lat,
          lng: g.lng,
          radius_m: g.radiusM,
          color: GEOFENCE_COLOR,
          fillOpacity: 0.08,
        });
      }
    }

    return { polylines: lines, staticMarkers: pins, circles: rings };
  }, [
    showActual,
    showOsrm,
    showFlags,
    showGeofences,
    playable,
    history.points,
    sortedLegs,
    detail.flags,
    geofences,
    t,
  ]);

  /* Playback marker — moving vehicle, never affects bounds. */
  const markers = React.useMemo<MapMarker[]>(() => {
    if (!playbackState) return staticMarkers;
    return [
      ...staticMarkers,
      {
        id: 'playback-marker',
        lat: playbackState.lat,
        lng: playbackState.lng,
        color: playbackState.speeding ? PLAYBACK_SPEEDING : PLAYBACK_NORMAL,
        kind: 'vehicle',
        heading: playbackPrev ? bearing(playbackPrev, playbackState) : 0,
        affectsBounds: false,
        title: `${Math.round(playbackState.speed)} km/h`,
      },
    ];
  }, [staticMarkers, playbackState, playbackPrev]);

  return (
    <div className="space-y-2">
      {/* Layer chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <LayerChip
          active={showActual}
          onClick={() => setShowActual((v) => !v)}
          label={t('tripAudit.detail.actualRoute', 'Actual route')}
          swatch={
            <span
              className="inline-block h-1 w-5 rounded-full"
              style={{ backgroundColor: ACTUAL_COLOR }}
            />
          }
        />
        <LayerChip
          active={showOsrm}
          onClick={() => setShowOsrm((v) => !v)}
          label={t('tripAudit.detail.osrmRoute', 'OSRM optimal')}
          swatch={
            <span
              className="inline-block h-0 w-5 border-t-2 border-dashed"
              style={{ borderColor: OSRM_COLOR }}
            />
          }
        />
        <LayerChip
          active={showFlags}
          onClick={() => setShowFlags((v) => !v)}
          label={t('tripAudit.detail.stopsAndFlags', 'Stops & flags')}
          swatch={
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STOP_COLOR }}
            />
          }
        />
        {geofences.length > 0 && (
          <LayerChip
            active={showGeofences}
            onClick={() => setShowGeofences((v) => !v)}
            label={t('tripAudit.detail.geofences', 'Geofences')}
            swatch={
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border-2"
                style={{ borderColor: GEOFENCE_COLOR }}
              />
            }
          />
        )}
        {history.loading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('tripAudit.detail.loadingTrace', 'Loading GPS trace…')}
          </span>
        )}
      </div>

      {/* Map */}
      <div className="h-[380px] overflow-hidden rounded-lg border">
        <MapView
          markers={markers}
          polylines={polylines}
          circles={circles}
          height="100%"
          liveUpdates
        />
      </div>

      {/* Scrubber / fallback note */}
      {playable ? (
        <div className="rounded-lg border bg-card">
          <EtitPlaybackPlayer
            points={history.points}
            stops={history.stops}
            sensors={history.sensors}
            currentMs={currentMs}
            onCurrentMsChange={setCurrentMs}
            playing={playing}
            onPlayingChange={setPlaying}
            speed={speed}
            onSpeedChange={setSpeed}
            onStateChange={handlePlaybackChange}
          />
        </div>
      ) : (
        !history.loading && (
          <p className="text-xs text-muted-foreground">
            {t(
              'tripAudit.detail.playbackUnavailable',
              'GPS playback is unavailable for this trip — showing the stored route instead.',
            )}
          </p>
        )
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Legs as sentences                                                           */
/* -------------------------------------------------------------------------- */

function LegSentence({ leg }: { leg: TripLeg }) {
  const { t, i18n } = useTranslation();

  const depart = leg.depart_ts ? formatCairoTime(leg.depart_ts, i18n.language) : '—';
  const arrive = leg.arrive_ts ? formatCairoTime(leg.arrive_ts, i18n.language) : '—';

  return (
    <li className="flex items-start gap-2.5 rounded-lg border p-3">
      <Badge variant="secondary" className="mt-0.5 shrink-0 tabular-nums">
        {leg.seq}
      </Badge>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-snug" dir="auto">
          {t('tripAudit.legs.sentence', {
            from: leg.from_name || '—',
            depart,
            to: leg.to_name || '—',
            arrive,
            actual: formatKm(leg.actual_km),
            osrm: formatKm(leg.osrm_km),
            defaultValue:
              'Left {{from}} at {{depart}} → arrived {{to}} at {{arrive}} — {{actual}} km actual vs {{osrm}} km optimal',
          })}
          {leg.night_window === 1 && (
            <Moon
              className="ms-1.5 inline-block h-3.5 w-3.5 align-[-2px] text-primary"
              aria-label={t('tripAudit.legs.night', 'Night window')}
            />
          )}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="outline">
            {t(`tripAudit.legType.${leg.leg_type}`, leg.leg_type || '—')}
          </Badge>
          <RatioBadge ratio={leg.distance_ratio} />
          <span className="tabular-nums" dir="ltr">
            {formatDurationSecs(leg.actual_secs)} / {formatDurationSecs(leg.osrm_secs)}
          </span>
          {leg.max_deviation_m != null && (
            <span className="tabular-nums" dir="ltr">
              {t('tripAudit.legs.maxDeviation', 'Max dev.')}{' '}
              {formatNumber(leg.max_deviation_m)} m
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function LegsList({ legs }: { legs: TripLeg[] }) {
  const { t } = useTranslation();
  const sorted = React.useMemo(() => [...legs].sort((a, b) => a.seq - b.seq), [legs]);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('tripAudit.detail.noLegs', 'No legs recorded for this trip.')}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((leg) => (
        <LegSentence key={leg.id} leg={leg} />
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Flags list                                                                  */
/* -------------------------------------------------------------------------- */

function FlagDetails({ flag }: { flag: TripFlag }) {
  const { t } = useTranslation();
  const details = parseFlagDetails(flag);

  switch (flag.flag_type) {
    case 'unplanned_stop': {
      const lat = asNumber(details.lat);
      const lng = asNumber(details.lng);
      const duration = asNumber(details.duration_secs);
      const address = asString(details.address);
      return (
        <div className="space-y-0.5 text-sm text-muted-foreground">
          {address && <p dir="auto">{address}</p>}
          <p>
            {duration != null && (
              <>
                {t('tripAudit.flagDetails.stoppedFor', 'Stopped for')}{' '}
                <span className="text-foreground" dir="ltr">
                  {formatDurationSecs(duration)}
                </span>
              </>
            )}
            {lat != null && lng != null && (
              <span className="ms-2 tabular-nums" dir="ltr">
                ({lat.toFixed(5)}, {lng.toFixed(5)})
              </span>
            )}
          </p>
        </div>
      );
    }
    case 'excess_distance': {
      const actualKm = asNumber(details.actual_km);
      const osrmKm = asNumber(details.osrm_km);
      const ratio = asNumber(details.ratio);
      return (
        <p className="text-sm text-muted-foreground" dir="ltr">
          {t('tripAudit.flagDetails.actual', 'Actual')} {formatKm(actualKm)} km ·{' '}
          {t('tripAudit.flagDetails.optimal', 'Optimal')} {formatKm(osrmKm)} km
          {ratio != null && <> · {ratio.toFixed(2)}×</>}
        </p>
      );
    }
    case 'suboptimal_order': {
      const drivenOrder = Array.isArray(details.driven_order)
        ? (details.driven_order as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const optimalOrder = Array.isArray(details.optimal_order)
        ? (details.optimal_order as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const savings = asNumber(details.savings_km);
      const OrderChips = ({ names, tone }: { names: string[]; tone: 'muted' | 'good' }) => (
        <span className="inline-flex flex-wrap items-center gap-1">
          {names.map((n, i) => (
            <React.Fragment key={`${n}-${i}`}>
              {i > 0 && <span className="text-muted-foreground">←</span>}
              <span
                dir="auto"
                className={
                  tone === 'good'
                    ? 'rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400'
                    : 'rounded bg-muted px-1.5 py-0.5'
                }
              >
                {n}
              </span>
            </React.Fragment>
          ))}
        </span>
      );
      return (
        <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            {t('tripAudit.flagDetails.orderTitle', 'A shorter delivery order existed')}
            {savings != null && (
              <span dir="ltr"> (−{formatKm(savings)} km)</span>
            )}
          </p>
          <p className="text-muted-foreground">
            {t('tripAudit.flagDetails.orderDriven', 'Driven')}:{' '}
            <OrderChips names={drivenOrder} tone="muted" />
          </p>
          <p className="text-muted-foreground">
            {t('tripAudit.flagDetails.orderOptimal', 'Optimal')}:{' '}
            <OrderChips names={optimalOrder} tone="good" />
          </p>
        </div>
      );
    }
    case 'ineffective_bundling': {
      const drops = Array.isArray(details.drops)
        ? (details.drops as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      const bundled = asNumber(details.bundled_km);
      const split = asNumber(details.split_km);
      const savingsPct = asNumber(details.savings_pct);
      return (
        <div className="space-y-1 rounded-md border border-sky-500/40 bg-sky-500/5 p-2 text-sm">
          <p className="font-medium text-sky-700 dark:text-sky-400">
            {t('tripAudit.flagDetails.bundlingTitle', 'These drop-offs point in different directions')}
          </p>
          <p className="text-muted-foreground" dir="auto">
            {drops.join(' · ')}
          </p>
          <p className="text-muted-foreground" dir="ltr">
            {t('tripAudit.flagDetails.bundlingBody', 'Bundled')}: {formatKm(bundled)} km ·{' '}
            {t('tripAudit.flagDetails.bundlingSplit', 'As separate trips')}: {formatKm(split)} km
            {savingsPct != null && <> · {t('tripAudit.flagDetails.bundlingSaves', 'bundling saves only')} {savingsPct.toFixed(1)}%</>}
          </p>
        </div>
      );
    }
    case 'skipped_delivery': {
      const dropOff = asString(details.drop_off_point);
      const reason = asString(details.reason);
      return (
        <div className="space-y-0.5 text-sm text-muted-foreground">
          {dropOff && (
            <p dir="auto">
              {t('tripAudit.flagDetails.dropoff', 'Drop-off')}: {dropOff}
            </p>
          )}
          {reason && <p dir="auto">{reason}</p>}
        </div>
      );
    }
    default: {
      const entries = Object.entries(details).filter(
        ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
      );
      if (entries.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          {entries.map(([key, value]) => (
            <span key={key} dir="auto">
              {key}: <span className="text-foreground">{String(value)}</span>
            </span>
          ))}
        </div>
      );
    }
  }
}

function FlagsList({
  flags,
  legs,
  orderVerified,
}: {
  flags: TripFlag[];
  legs: TripLeg[];
  orderVerified?: boolean;
}) {
  const { t } = useTranslation();

  // Silence is ambiguous: when a multi-drop trip's ordering check ran and
  // found the driven order already optimal, say so — otherwise "no order
  // flag" is indistinguishable from "not checked".
  const verifiedLine = orderVerified ? (
    <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {t('tripAudit.detail.orderVerified', 'Delivery order verified — driven order was already the shortest.')}
    </p>
  ) : null;

  if (flags.length === 0) {
    return (
      <div className="space-y-2">
        {verifiedLine}
        <p className="text-sm text-muted-foreground">
          {t('tripAudit.detail.noFlags', 'No flags raised for this trip.')}
        </p>
      </div>
    );
  }

  const legSeq = new Map(legs.map((leg) => [leg.id, leg.seq]));

  return (
    <div className="space-y-2">
      {verifiedLine}
    <ul className="space-y-2">
      {flags.map((flag) => {
        const typeLabel = (KNOWN_FLAG_TYPES as readonly string[]).includes(flag.flag_type)
          ? t(`tripAudit.flagTypes.${flag.flag_type}`, flag.flag_type)
          : flag.flag_type;
        const seq = flag.leg_id != null ? legSeq.get(flag.leg_id) : undefined;
        return (
          <li key={flag.id} className="flex items-start gap-3 rounded-lg border p-3">
            <span className="mt-0.5">{SEVERITY_ICON[flag.severity]}</span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{typeLabel}</span>
                <Badge variant={SEVERITY_VARIANT[flag.severity]}>
                  {t(`tripAudit.severity.${flag.severity}`, flag.severity)}
                </Badge>
                {seq != null && (
                  <span className="text-xs text-muted-foreground">
                    {t('tripAudit.flagDetails.leg', 'Leg {{seq}}', { seq })}
                  </span>
                )}
              </div>
              <FlagDetails flag={flag} />
            </div>
          </li>
        );
      })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Review section                                                              */
/* -------------------------------------------------------------------------- */

function ReviewSection({ detail }: { detail: TripMatchDetail }) {
  const { t, i18n } = useTranslation();
  const reviewMatch = useReviewMatch();
  const [note, setNote] = React.useState('');

  // Re-seed the note when a different match is opened.
  const seededId = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (seededId.current === detail.id) return;
    seededId.current = detail.id;
    setNote(detail.review_note ?? '');
  }, [detail.id, detail.review_note]);

  const handleReview = async () => {
    try {
      await reviewMatch.mutateAsync({ id: detail.id, note });
    } catch {
      // Toast handled by the mutation
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {detail.reviewed_at ? (
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-medium">
              {t('tripAudit.detail.reviewedAt', 'Reviewed {{when}}', {
                when: formatCairoDateTime(detail.reviewed_at, i18n.language),
              })}
            </p>
            {detail.review_note && (
              <p className="text-muted-foreground" dir="auto">
                {detail.review_note}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium">
          {t('tripAudit.detail.reviewTitle', 'Review this trip')}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="trip-audit-review-note">
          {t('tripAudit.detail.reviewNote', 'Review note')}
        </Label>
        <Textarea
          id="trip-audit-review-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('tripAudit.detail.notePlaceholder', 'Optional note…')}
          rows={2}
          dir="auto"
        />
      </div>
      <Button
        onClick={handleReview}
        disabled={reviewMatch.isPending}
        className="gap-2"
      >
        {reviewMatch.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {detail.reviewed_at
          ? t('tripAudit.detail.updateReview', 'Update review')
          : t('tripAudit.detail.markReviewed', 'Mark reviewed')}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                      */
/* -------------------------------------------------------------------------- */

interface TripAuditDetailDialogProps {
  matchId: number | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full trip drill-down: playback map first (the vehicle's real GPS trace
 * scrubbed over the trip window, with actual/OSRM/flags/geofence layers),
 * then legs as sentences, flags, and the review action. All the numeric
 * columns removed from the queue list live here.
 */
export function TripAuditDetailDialog({ matchId, onOpenChange }: TripAuditDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const open = matchId != null;
  const { data: detail, isLoading, isError } = useTripMatch(matchId);
  const history = useTripPlaybackHistory(detail ?? null, open);
  const reasonLabel = useUnmatchedReasonLabel();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {t('tripAudit.detail.title', 'Trip audit')}
            {detail && (
              <>
                <span className="font-normal text-muted-foreground">
                  {formatCairoDay(detail.day_local, i18n.language)}
                </span>
                <span className="font-medium" dir="ltr">
                  {detail.car_no_plate || '—'}
                </span>
                {detail.driver_name && (
                  <span className="font-normal text-muted-foreground" dir="auto">
                    {detail.driver_name}
                  </span>
                )}
                <Badge variant={STATUS_VARIANT[detail.status]}>
                  {t(`tripAudit.status.${detail.status}`, detail.status)}
                </Badge>
                {detail.status === 'unmatched' && detail.unmatched_reason && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {reasonLabel(detail.unmatched_reason)}
                  </Badge>
                )}
                {detail.status !== 'unmatched' && (
                  <Button asChild variant="outline" size="sm" className="h-7 gap-1.5">
                    <Link to={`/trip-audit/${detail.id}/replay`}>
                      <Play className="h-3.5 w-3.5" />
                      {t('tripReplay.openReplay', 'Open replay')}
                    </Link>
                  </Button>
                )}
              </>
            )}
          </DialogTitle>
          <DialogDescription dir="auto">
            {detail
              ? [detail.company, detail.terminal_name].filter(Boolean).join(' · ') ||
                t('tripAudit.detail.description', 'Actual route vs OSRM optimal and raised flags.')
              : t('tripAudit.detail.description', 'Actual route vs OSRM optimal and raised flags.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {isError && !isLoading && (
            <p className="text-sm text-destructive">
              {t('tripAudit.detail.loadError', 'Failed to load trip details.')}
            </p>
          )}

          {detail && (
            <>
              {/* Map first, full width */}
              <PlaybackMap detail={detail} history={history} />

              {/* Summary strip — the old list columns live here now */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <SummaryItem
                  label={t('tripAudit.table.deliveries', 'Deliveries')}
                  value={
                    <span dir="ltr" className="tabular-nums">
                      {detail.deliveries_visited}/{detail.deliveries_expected}
                    </span>
                  }
                />
                <SummaryItem
                  label={t('tripAudit.detail.kmActualVsOsrm', 'km (actual / OSRM)')}
                  value={
                    <span dir="ltr" className="tabular-nums">
                      {formatKm(detail.actual_km)} / {formatKm(detail.osrm_km)}
                    </span>
                  }
                />
                <SummaryItem
                  label={t('tripAudit.legs.duration', 'Duration (actual / OSRM)')}
                  value={
                    <span dir="ltr" className="tabular-nums">
                      {formatDurationSecs(detail.actual_secs)} /{' '}
                      {formatDurationSecs(detail.osrm_secs)}
                    </span>
                  }
                />
                <SummaryItem
                  label={t('tripAudit.table.distanceRatio', 'Dist. ratio')}
                  value={<RatioBadge ratio={detail.distance_ratio} />}
                />
                <SummaryItem
                  label={t('tripAudit.table.durationRatio', 'Dur. ratio')}
                  value={<RatioBadge ratio={detail.duration_ratio} />}
                />
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t('tripAudit.detail.legs', 'Legs')}
                </h3>
                <LegsList legs={detail.legs} />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t('tripAudit.detail.flags', 'Flags')}
                </h3>
                <FlagsList
                  flags={detail.flags}
                  legs={detail.legs}
                  orderVerified={
                    detail.deliveries_expected >= 2 &&
                    !detail.flags.some((f) => f.flag_type === 'suboptimal_order') &&
                    detail.legs
                      .filter((l) => l.leg_type !== 'return')
                      .every((l) => l.osrm_km != null)
                  }
                />
              </section>

              <ReviewSection detail={detail} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryItem({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
