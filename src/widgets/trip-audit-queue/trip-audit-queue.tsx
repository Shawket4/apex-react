import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  CheckCircle2,
  Flag,
  Loader2,
  MessageSquarePlus,
  Package,
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@/shared/lib/cn';
import { formatCairoDay } from '@/shared/lib/cairo';
import { formatNumber } from '@/shared/lib/format';
import { useReviewMatch } from '@/entities/trip-audit/queries';
import type { TripMatch } from '@/entities/trip-audit/schemas';
import { useUnmatchedReasonLabel } from '@/widgets/trip-audit-matches-table';

/* -------------------------------------------------------------------------- */
/* Row severity                                                                */
/*                                                                             */
/* The server reports `critical_count` (exact per-flag severities): any      */
/* critical flag — or an unmatched trip — reads as critical; any other flag, */
/* missed deliveries, or a ratio above 1.2 reads as warning.                 */
/* -------------------------------------------------------------------------- */

export type QueueSeverity = 'critical' | 'warning' | 'ok';

export function severityOf(m: TripMatch): QueueSeverity {
  if (m.status === 'unmatched' || m.critical_count > 0) return 'critical';
  const ratio = m.distance_ratio;
  const missedDeliveries = m.deliveries_expected > 0 && m.deliveries_visited < m.deliveries_expected;
  if (m.flag_count > 0 || missedDeliveries || (ratio != null && ratio > 1.2)) return 'warning';
  return 'ok';
}

const SEVERITY_VARIANT: Record<QueueSeverity, 'destructive' | 'warning' | 'success'> = {
  critical: 'destructive',
  warning: 'warning',
  ok: 'success',
};

/* -------------------------------------------------------------------------- */
/* Verdict sentence                                                            */
/* -------------------------------------------------------------------------- */

function km(v: number): string {
  return formatNumber(v, v < 100 ? 1 : 0);
}

function VerdictSentence({ match }: { match: TripMatch }) {
  const { t } = useTranslation();
  const reasonLabel = useUnmatchedReasonLabel();

  if (match.status === 'unmatched') {
    return (
      <span dir="auto">
        {t('tripAudit.queue.unmatched', {
          reason: match.unmatched_reason
            ? reasonLabel(match.unmatched_reason)
            : t('tripAudit.queue.unknownReason', 'unknown reason'),
          defaultValue: 'Not audited — {{reason}}',
        })}
      </span>
    );
  }

  const terminal = match.terminal_name || match.company || '—';
  const actual = match.actual_km;
  const osrm = match.osrm_km;

  if (actual == null || osrm == null || !Number.isFinite(actual) || !Number.isFinite(osrm)) {
    return (
      <span dir="auto">
        {t('tripAudit.queue.verdictNoData', {
          terminal,
          defaultValue: '{{terminal}} — no distance comparison available',
        })}
      </span>
    );
  }

  const excess = actual - osrm;
  if (excess > 0.5) {
    return (
      <span dir="auto">
        {t('tripAudit.queue.verdict', {
          terminal,
          actual: km(actual),
          osrm: km(osrm),
          excess: km(excess),
          defaultValue:
            '{{terminal}} — drove {{actual}} km vs {{osrm}} km optimal (+{{excess}} km excess)',
        })}
      </span>
    );
  }
  return (
    <span dir="auto">
      {t('tripAudit.queue.verdictEfficient', {
        terminal,
        actual: km(actual),
        osrm: km(osrm),
        defaultValue: '{{terminal}} — drove {{actual}} km vs {{osrm}} km optimal — on target',
      })}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline review action                                                        */
/*                                                                             */
/* One-click "Mark reviewed" plus a note popover. Both stop propagation so    */
/* they never open the row's detail view.                                     */
/* -------------------------------------------------------------------------- */

function ReviewInline({ match }: { match: TripMatch }) {
  const { t, i18n } = useTranslation();
  const reviewMatch = useReviewMatch();
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState('');

  if (match.reviewed_at) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-success"
        title={match.review_note ?? undefined}
      >
        <CheckCircle2 className="h-4 w-4" />
        {t('tripAudit.queue.reviewedOn', {
          when: formatCairoDay(match.reviewed_at, i18n.language),
          defaultValue: 'Reviewed {{when}}',
        })}
      </span>
    );
  }

  const pending = reviewMatch.isPending;

  const submit = (withNote: boolean) => {
    reviewMatch.mutate(
      { id: match.id, note: withNote ? note : undefined },
      { onSuccess: () => setNoteOpen(false) },
    );
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 text-xs"
        disabled={pending}
        onClick={() => submit(false)}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5 text-success" />
        )}
        {t('tripAudit.queue.markReviewed', 'Mark reviewed')}
      </Button>
      <Popover open={noteOpen} onOpenChange={setNoteOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={t('tripAudit.queue.reviewWithNote', 'Review with a note')}
            title={t('tripAudit.queue.reviewWithNote', 'Review with a note')}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-2 p-3">
          <Label htmlFor={`queue-note-${match.id}`} className="text-xs">
            {t('tripAudit.detail.reviewNote', 'Review note')}
          </Label>
          <Textarea
            id={`queue-note-${match.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('tripAudit.detail.notePlaceholder', 'Optional note…')}
            rows={2}
            dir="auto"
          />
          <Button
            type="button"
            size="sm"
            className="w-full gap-1.5"
            disabled={pending}
            onClick={() => submit(true)}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t('tripAudit.queue.markReviewed', 'Mark reviewed')}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

function QueueRow({ match, onOpen }: { match: TripMatch; onOpen: (m: TripMatch) => void }) {
  const { t, i18n } = useTranslation();
  const severity = severityOf(match);
  const missedDeliveries =
    match.deliveries_expected > 0 && match.deliveries_visited < match.deliveries_expected;

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
      className="flex cursor-pointer flex-col gap-2 p-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 space-y-1.5">
        {/* Verdict line */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[severity]} className="shrink-0">
            {severity === 'ok'
              ? t('tripAudit.queue.severityOk', 'OK')
              : t(`tripAudit.severity.${severity}`, severity)}
          </Badge>
          <span className="min-w-0 text-sm font-medium leading-snug">
            <VerdictSentence match={match} />
          </span>
        </div>
        {/* Meta line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="whitespace-nowrap">
            {formatCairoDay(match.day_local, i18n.language)}
          </span>
          {match.car_no_plate && (
            <span className="whitespace-nowrap font-medium text-foreground" dir="ltr">
              {match.car_no_plate}
            </span>
          )}
          {match.driver_name && (
            <span className="max-w-[180px] truncate" dir="auto">
              {match.driver_name}
            </span>
          )}
          {match.deliveries_expected > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 tabular-nums',
                missedDeliveries && 'font-medium text-warning',
              )}
            >
              <Package className="h-3 w-3" />
              <span dir="ltr">
                {match.deliveries_visited}/{match.deliveries_expected}
              </span>{' '}
              {t('tripAudit.queue.deliveries', 'deliveries')}
            </span>
          )}
          {match.flag_count > 0 && (
            <Badge variant="warning" className="tabular-nums">
              <Flag className="h-3 w-3" />
              {match.flag_count}
            </Badge>
          )}
        </div>
      </div>

      <div className="shrink-0 sm:ms-3">
        <ReviewInline match={match} />
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
}

/**
 * "Review queue" — verdict sentences instead of data rows. Each row reads as
 * a judgement ("drove 119 km vs 55 km optimal"), carries the day / plate /
 * driver / deliveries / flag-count context, and offers a one-click
 * mark-reviewed that never opens the detail view. Full numeric columns live
 * inside the detail dialog.
 */
export function TripAuditQueue({ matches, loading, onOpen }: TripAuditQueueProps) {
  const { t } = useTranslation();

  if (loading && matches.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        title={t('tripAudit.table.empty', 'No audited trips in this range')}
        description={t(
          'tripAudit.table.emptyDesc',
          'Adjust the date range or run a scan to audit recent trips.',
        )}
      />
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
