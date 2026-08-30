import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';
import { formatCairoDay } from '@/shared/lib/cairo';
import { formatNumber } from '@/shared/lib/format';
import type { TripMatch } from '@/entities/trip-audit/schemas';
import { useUnmatchedReasonLabel } from '@/widgets/trip-audit-matches-table';

/* -------------------------------------------------------------------------- */
/* Row severity                                                                */
/*                                                                             */
/* The server reports `critical_count` (exact per-flag severities): any        */
/* critical flag — or an unmatched trip — reads as critical; any other flag,   */
/* missed deliveries, or a ratio above 1.2 reads as warning.                   */
/* -------------------------------------------------------------------------- */

export type QueueSeverity = 'critical' | 'warning' | 'ok';

export function severityOf(m: TripMatch): QueueSeverity {
  if (m.status === 'unmatched' || m.critical_count > 0) return 'critical';
  const ratio = m.distance_ratio;
  const missedDeliveries = m.deliveries_expected > 0 && m.deliveries_visited < m.deliveries_expected;
  if (m.flag_count > 0 || missedDeliveries || (ratio != null && ratio > 1.2)) return 'warning';
  return 'ok';
}

/* -------------------------------------------------------------------------- */
/* Verdict sentence                                                            */
/* -------------------------------------------------------------------------- */

function km(v: number): string {
  return formatNumber(v, v < 100 ? 1 : 0);
}

function verdictText(
  match: TripMatch,
  t: ReturnType<typeof useTranslation>['t'],
  reasonLabel: (code: string) => string,
): string {
  if (match.status === 'unmatched') {
    return t('tripAudit.queue.unmatched', {
      reason: match.unmatched_reason
        ? reasonLabel(match.unmatched_reason)
        : t('tripAudit.queue.unknownReason', 'unknown reason'),
      defaultValue: 'Not audited — {{reason}}',
    });
  }

  const actual = match.actual_km;
  const osrm = match.osrm_km;

  if (actual == null || osrm == null || !Number.isFinite(actual) || !Number.isFinite(osrm)) {
    return t('tripAudit.queue.noComparison', 'No distance comparison available');
  }

  const excess = actual - osrm;
  if (excess > 0.5) {
    return t('tripAudit.queue.drove', {
      actual: km(actual),
      osrm: km(osrm),
      excess: km(excess),
      defaultValue: 'Drove {{actual}} km vs {{osrm}} km optimal — +{{excess}} km excess',
    });
  }
  return t('tripAudit.queue.droveOnTarget', {
    actual: km(actual),
    osrm: km(osrm),
    defaultValue: 'Drove {{actual}} km vs {{osrm}} km optimal — on target',
  });
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/*                                                                             */
/* Deliberately quiet: exactly three visual weights.                           */
/*   1. Primary line — day · terminal · plate (· driver on sm+).               */
/*   2. Verdict line — one muted sentence (plus deliveries when short).        */
/*   3. Right rail — a severity chip (critical/warning only) and ONE action:   */
/*      "Review", which opens the detail view. Reviewed rows fade out and      */
/*      swap the button for a subtle check.                                    */
/* -------------------------------------------------------------------------- */

function QueueRow({ match, onOpen }: { match: TripMatch; onOpen: (m: TripMatch) => void }) {
  const { t, i18n } = useTranslation();
  const reasonLabel = useUnmatchedReasonLabel();
  const severity = severityOf(match);
  const reviewed = Boolean(match.reviewed_at);
  const missedDeliveries =
    match.deliveries_expected > 0 && match.deliveries_visited < match.deliveries_expected;
  const place = match.terminal_name || match.company || '—';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(match)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(match);
        }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-3 px-3 py-2.5 md:px-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        reviewed && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {/* Primary line */}
        <div className="flex min-w-0 items-baseline gap-x-2.5">
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatCairoDay(match.day_local, i18n.language)}
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium leading-snug" dir="auto" title={place}>
            {place}
          </span>
          {match.car_no_plate && (
            <span className="shrink-0 font-mono text-xs text-foreground" dir="ltr">
              {match.car_no_plate}
            </span>
          )}
          {match.driver_name && (
            <span
              className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:inline"
              dir="auto"
            >
              {match.driver_name}
            </span>
          )}
        </div>
        {/* Verdict line */}
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate" dir="auto">
            {verdictText(match, t, reasonLabel)}
          </span>
          {match.deliveries_expected > 0 && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 font-mono tabular-nums',
                missedDeliveries && 'font-medium text-warning',
              )}
            >
              <Package className="h-3 w-3" aria-hidden="true" />
              <span dir="ltr">
                {match.deliveries_visited}/{match.deliveries_expected}
              </span>
              {t('tripAudit.queue.deliveries', 'deliveries')}
            </span>
          )}
        </p>
      </div>

      {/* Right rail — severity + the single action */}
      <div className="flex shrink-0 items-center gap-2.5">
        {reviewed ? (
          <span
            className="hidden items-center gap-1 text-xs text-success sm:flex"
            title={match.review_note ?? undefined}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('tripAudit.queue.reviewedOn', {
              when: formatCairoDay(match.reviewed_at as string, i18n.language),
              defaultValue: 'Reviewed {{when}}',
            })}
          </span>
        ) : (
          severity !== 'ok' && (
            <Badge
              variant={severity === 'critical' ? 'destructive' : 'warning'}
              className="hidden sm:inline-flex"
            >
              {t(`tripAudit.severity.${severity}`, severity)}
            </Badge>
          )
        )}
        <Button
          type="button"
          size="sm"
          variant={reviewed ? 'ghost' : 'outline'}
          className="h-8 gap-1 text-xs"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(match);
          }}
        >
          {reviewed
            ? t('tripAudit.queue.view', 'View')
            : t('tripAudit.queue.review', 'Review')}
          <ChevronRight className="rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Queue list                                                                  */
/* -------------------------------------------------------------------------- */

interface TripAuditQueueProps {
  matches: TripMatch[];
  loading?: boolean;
  onOpen: (match: TripMatch) => void;
  /** Rendered when the list is empty — lets the page vary the empty state per view. */
  empty?: React.ReactNode;
}

/**
 * The review queue. Every row answers one question — "does this trip need
 * attention?" — with one primary line, one verdict sentence and one action.
 * All numeric detail lives in the detail dialog behind "Review".
 */
export function TripAuditQueue({ matches, loading, onOpen, empty }: TripAuditQueueProps) {
  const { t } = useTranslation();

  if (loading && matches.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-none" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState
            title={t('tripAudit.table.empty', 'No audited trips in this range')}
            description={t(
              'tripAudit.table.emptyDesc',
              'Adjust the date range or run a scan to audit recent trips.',
            )}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        'divide-y overflow-hidden rounded-lg border bg-card',
        loading && 'opacity-60',
      )}
    >
      {matches.map((match) => (
        <QueueRow key={match.id} match={match} onOpen={onOpen} />
      ))}
    </div>
  );
}
