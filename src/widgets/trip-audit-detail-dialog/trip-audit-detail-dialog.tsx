import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  Moon,
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
import type { MapMarker, MapPolyline } from '@/shared/lib/maps/types';
import { decodePolyline5 } from '@/shared/lib/polyline';
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
import { formatDurationSecs, formatKm, RatioBadge } from '@/widgets/trip-audit-matches-table';

/* -------------------------------------------------------------------------- */
/* Colors                                                                      */
/* -------------------------------------------------------------------------- */

const ACTUAL_COLOR = '#3b82f6'; // blue — GPS trace
const OSRM_COLOR = '#16a34a'; // green dashed — OSRM optimal
const STOP_COLOR = '#f59e0b'; // amber — unplanned stop markers

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
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

/* -------------------------------------------------------------------------- */
/* Map section                                                                 */
/* -------------------------------------------------------------------------- */

function DetailMap({ detail }: { detail: TripMatchDetail }) {
  const { t } = useTranslation();

  const { polylines, markers } = React.useMemo(() => {
    const lines: MapPolyline[] = [];
    const pins: MapMarker[] = [];
    const legs = [...detail.legs].sort((a, b) => a.seq - b.seq);

    legs.forEach((leg, i) => {
      const actual = decodePolyline5(leg.actual_geometry);
      const osrm = decodePolyline5(leg.osrm_geometry); // '' decodes to []

      if (actual.length > 1) {
        lines.push({
          id: `leg-${leg.id}-actual`,
          path: actual,
          color: ACTUAL_COLOR,
          weight: 4,
          opacity: 0.9,
        });
      }
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

      // Leg endpoint markers, taken from the actual trace when available,
      // falling back to the OSRM geometry.
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
        color: i === legs.length - 1 ? '#dc2626' : '#64748b',
        kind: i === legs.length - 1 ? 'route-end' : 'pin',
        title: leg.to_name || undefined,
      });
    });

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

    return { polylines: lines, markers: pins };
  }, [detail, t]);

  return (
    <div className="space-y-2">
      <div className="h-[360px] overflow-hidden rounded-lg border">
        <MapView markers={markers} polylines={polylines} height="100%" />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-1 w-6 rounded-full"
            style={{ backgroundColor: ACTUAL_COLOR }}
          />
          {t('tripAudit.detail.actualRoute', 'Actual route')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-6 border-t-2 border-dashed"
            style={{ borderColor: OSRM_COLOR }}
          />
          {t('tripAudit.detail.osrmRoute', 'OSRM optimal')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: STOP_COLOR }}
          />
          {t('tripAudit.detail.unplannedStops', 'Unplanned stops')}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Legs table                                                                  */
/* -------------------------------------------------------------------------- */

function LegsTable({ legs }: { legs: TripLeg[] }) {
  const { t, i18n } = useTranslation();
  const sorted = React.useMemo(() => [...legs].sort((a, b) => a.seq - b.seq), [legs]);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('tripAudit.detail.noLegs', 'No legs recorded for this trip.')}
      </p>
    );
  }

  const th = 'px-3 py-2 text-start text-xs font-medium text-muted-foreground whitespace-nowrap';
  const td = 'px-3 py-2 whitespace-nowrap';

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className={th}>#</th>
            <th className={th}>{t('tripAudit.legs.type', 'Type')}</th>
            <th className={th}>{t('tripAudit.legs.fromTo', 'From → To')}</th>
            <th className={th}>{t('tripAudit.legs.depart', 'Depart')}</th>
            <th className={th}>{t('tripAudit.legs.arrive', 'Arrive')}</th>
            <th className={th}>{t('tripAudit.legs.km', 'km (actual / OSRM)')}</th>
            <th className={th}>{t('tripAudit.legs.ratio', 'Ratio')}</th>
            <th className={th}>{t('tripAudit.legs.duration', 'Duration (actual / OSRM)')}</th>
            <th className={th}>{t('tripAudit.legs.maxDeviation', 'Max dev.')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((leg) => (
            <tr key={leg.id} className="border-b last:border-b-0">
              <td className={`${td} text-muted-foreground tabular-nums`}>{leg.seq}</td>
              <td className={td}>
                <span className="flex items-center gap-1.5">
                  <Badge variant="secondary">
                    {t(`tripAudit.legType.${leg.leg_type}`, leg.leg_type || '—')}
                  </Badge>
                  {leg.night_window === 1 && (
                    <Moon
                      className="h-3.5 w-3.5 text-primary"
                      aria-label={t('tripAudit.legs.night', 'Night window')}
                    />
                  )}
                </span>
              </td>
              <td className={`${td} max-w-[240px] truncate`} dir="auto">
                {leg.from_name || '—'} → {leg.to_name || '—'}
              </td>
              <td className={`${td} tabular-nums`} dir="ltr">
                {leg.depart_ts ? formatCairoTime(leg.depart_ts, i18n.language) : '—'}
              </td>
              <td className={`${td} tabular-nums`} dir="ltr">
                {leg.arrive_ts ? formatCairoTime(leg.arrive_ts, i18n.language) : '—'}
              </td>
              <td className={`${td} tabular-nums`} dir="ltr">
                {formatKm(leg.actual_km)} / {formatKm(leg.osrm_km)}
              </td>
              <td className={td}>
                <RatioBadge ratio={leg.distance_ratio} />
              </td>
              <td className={`${td} tabular-nums`} dir="ltr">
                {formatDurationSecs(leg.actual_secs)} / {formatDurationSecs(leg.osrm_secs)}
              </td>
              <td className={`${td} tabular-nums`} dir="ltr">
                {leg.max_deviation_m != null ? `${formatNumber(leg.max_deviation_m)} m` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function FlagsList({ flags, legs }: { flags: TripFlag[]; legs: TripLeg[] }) {
  const { t } = useTranslation();

  if (flags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('tripAudit.detail.noFlags', 'No flags raised for this trip.')}
      </p>
    );
  }

  const legSeq = new Map(legs.map((leg) => [leg.id, leg.seq]));

  return (
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
 * Full trip drill-down: actual vs OSRM routes on the map, per-leg
 * comparison table, raised flags with per-type details, and the review
 * action.
 */
export function TripAuditDetailDialog({ matchId, onOpenChange }: TripAuditDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const open = matchId != null;
  const { data: detail, isLoading, isError } = useTripMatch(matchId);

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
              {/* Summary strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  label={t('tripAudit.table.distanceRatio', 'Dist. ratio')}
                  value={<RatioBadge ratio={detail.distance_ratio} />}
                />
                <SummaryItem
                  label={t('tripAudit.table.durationRatio', 'Dur. ratio')}
                  value={<RatioBadge ratio={detail.duration_ratio} />}
                />
              </div>

              <DetailMap detail={detail} />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t('tripAudit.detail.legs', 'Legs')}
                </h3>
                <LegsTable legs={detail.legs} />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t('tripAudit.detail.flags', 'Flags')}
                </h3>
                <FlagsList flags={detail.flags} legs={detail.legs} />
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
