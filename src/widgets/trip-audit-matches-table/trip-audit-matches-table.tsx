import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Flag } from 'lucide-react';
import { DataTable } from '@/shared/ui/data-table';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { formatCairoDay } from '@/shared/lib/cairo';
import { KNOWN_UNMATCHED_REASONS, type TripMatch, type TripMatchStatus } from '@/entities/trip-audit/schemas';
import { formatKm, RatioBadge } from './audit-format';

/* -------------------------------------------------------------------------- */
/* Status + reason presentation                                                */
/* -------------------------------------------------------------------------- */

const STATUS_VARIANT: Record<TripMatchStatus, 'success' | 'warning' | 'destructive'> = {
  matched: 'success',
  partial: 'warning',
  unmatched: 'destructive',
};

/** Translate a proxy unmatched_reason code; unknown codes are echoed as-is. */
function useUnmatchedReasonLabel() {
  const { t } = useTranslation();
  return React.useCallback(
    (reason: string): string => {
      if ((KNOWN_UNMATCHED_REASONS as readonly string[]).includes(reason)) {
        return t(`tripAudit.unmatchedReason.${reason}`, reason);
      }
      return reason;
    },
    [t],
  );
}

/* -------------------------------------------------------------------------- */
/* Columns                                                                     */
/* -------------------------------------------------------------------------- */

function useMatchColumns(): ColumnDef<TripMatch>[] {
  const { t, i18n } = useTranslation();
  const reasonLabel = useUnmatchedReasonLabel();

  return React.useMemo(
    () => [
      {
        accessorKey: 'day_local',
        header: t('tripAudit.table.day', 'Day'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            {formatCairoDay(row.original.day_local, i18n.language)}
          </div>
        ),
      },
      {
        accessorKey: 'company',
        header: t('tripAudit.table.company', 'Company'),
        cell: ({ row }) => (
          <div className="max-w-[160px] truncate" dir="auto">
            {row.original.company || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'terminal_name',
        header: t('tripAudit.table.terminal', 'Terminal'),
        cell: ({ row }) => (
          <div className="max-w-[160px] truncate" dir="auto">
            {row.original.terminal_name || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'car_no_plate',
        header: t('tripAudit.table.plate', 'Plate'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-medium" dir="ltr">
            {row.original.car_no_plate || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'driver_name',
        header: t('tripAudit.table.driver', 'Driver'),
        cell: ({ row }) => (
          <div className="max-w-[150px] truncate" dir="auto">
            {row.original.driver_name || '—'}
          </div>
        ),
      },
      {
        id: 'deliveries',
        header: t('tripAudit.table.deliveries', 'Deliveries'),
        accessorFn: (row) => row.deliveries_visited,
        cell: ({ row }) => {
          const { deliveries_visited: visited, deliveries_expected: expected } = row.original;
          const missing = expected > 0 && visited < expected;
          return (
            <span
              className={missing ? 'font-medium text-warning tabular-nums' : 'tabular-nums'}
              dir="ltr"
            >
              {visited}/{expected}
            </span>
          );
        },
      },
      {
        accessorKey: 'actual_km',
        header: t('tripAudit.table.actualKm', 'Actual km'),
        cell: ({ row }) => (
          <span className="tabular-nums" dir="ltr">
            {formatKm(row.original.actual_km)}
          </span>
        ),
      },
      {
        accessorKey: 'osrm_km',
        header: t('tripAudit.table.osrmKm', 'OSRM km'),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums" dir="ltr">
            {formatKm(row.original.osrm_km)}
          </span>
        ),
      },
      {
        accessorKey: 'distance_ratio',
        header: t('tripAudit.table.distanceRatio', 'Dist. ratio'),
        cell: ({ row }) => <RatioBadge ratio={row.original.distance_ratio} />,
      },
      {
        accessorKey: 'duration_ratio',
        header: t('tripAudit.table.durationRatio', 'Dur. ratio'),
        cell: ({ row }) => <RatioBadge ratio={row.original.duration_ratio} />,
      },
      {
        accessorKey: 'flag_count',
        header: t('tripAudit.table.flags', 'Flags'),
        cell: ({ row }) => {
          const count = row.original.flag_count;
          if (count <= 0) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant="warning" className="tabular-nums">
              <Flag className="h-3 w-3" />
              {count}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('tripAudit.table.status', 'Status'),
        cell: ({ row }) => {
          const { status, unmatched_reason } = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant={STATUS_VARIANT[status]}
                title={unmatched_reason ? reasonLabel(unmatched_reason) : undefined}
              >
                {t(`tripAudit.status.${status}`, status)}
              </Badge>
              {status === 'unmatched' && unmatched_reason && (
                <Badge variant="outline" className="text-muted-foreground">
                  {reasonLabel(unmatched_reason)}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'reviewed_at',
        header: t('tripAudit.table.reviewed', 'Reviewed'),
        cell: ({ row }) =>
          row.original.reviewed_at ? (
            <CheckCircle2
              className="h-4 w-4 text-success"
              aria-label={t('tripAudit.table.reviewed', 'Reviewed')}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, i18n.language, reasonLabel],
  );
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

interface TripAuditMatchesTableProps {
  matches: TripMatch[];
  loading?: boolean;
  onRowClick?: (match: TripMatch) => void;
}

export function TripAuditMatchesTable({
  matches,
  loading,
  onRowClick,
}: TripAuditMatchesTableProps) {
  const { t } = useTranslation();
  const columns = useMatchColumns();

  return (
    <DataTable
      columns={columns}
      data={matches}
      loading={loading}
      onRowClick={onRowClick}
      emptyState={
        <EmptyState
          title={t('tripAudit.table.empty', 'No audited trips in this range')}
          description={t(
            'tripAudit.table.emptyDesc',
            'Adjust the date range or run a scan to audit recent trips.',
          )}
        />
      }
    />
  );
}
