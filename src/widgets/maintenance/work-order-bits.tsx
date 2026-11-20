import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, CircleDot, Droplets } from 'lucide-react';
import { workOrderSummary } from '@/entities/maintenance/lib';
import { prefetchWorkOrder } from '@/entities/maintenance/queries';
import type { WorkOrderRow } from '@/entities/maintenance/schemas';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { intentProps, preloadChunk } from '@/shared/lib/prefetch';
import { Badge } from '@/shared/ui/badge';
import { maintDate } from './maint-date';

export function WorkOrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant = status === 'open' ? 'warning' : status === 'closed' ? 'success' : 'secondary';
  return (
    <Badge variant={variant} className="shrink-0">
      {t(`workOrders.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

/** "2 of 5 done", or a dash for an order with no tasks. */
export function WorkOrderProgress({ row }: { row: WorkOrderRow }) {
  const { t } = useTranslation();
  if (row.task_count <= 0) return <span className="opacity-40">—</span>;
  return (
    <span className="tabular-nums">
      {t('workOrders.progress', { done: row.done_count, total: row.task_count })}
    </span>
  );
}

/** Oil liters and tire jobs under an order; nothing when it has neither. */
export function WorkOrderExtras({ row, className }: { row: WorkOrderRow; className?: string }) {
  const { t } = useTranslation();
  const hasOil = row.oil_liters !== null && row.oil_liters > 0;
  const hasTires = row.tire_ops > 0;
  if (!hasOil && !hasTires) return null;
  return (
    <span className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
      {hasOil && (
        <span className="inline-flex items-center gap-1">
          <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
          {t('workOrders.oilLiters', { liters: formatNumber(row.oil_liters, 1) })}
        </span>
      )}
      {hasTires && (
        <span className="inline-flex items-center gap-1">
          <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
          {t('workOrders.tireOps', { n: row.tire_ops })}
        </span>
      )}
    </span>
  );
}

/** "Opened by Ahmed"; nothing when the server did not say who. */
export function WorkOrderOpenedBy({ row, className }: { row: WorkOrderRow; className?: string }) {
  const { t } = useTranslation();
  const name = row.opened_by?.trim();
  if (!name) return null;
  return (
    <span className={className}>
      {t('workOrders.fields.openedBy')} <bdi>{name}</bdi>
    </span>
  );
}

interface WorkOrderLinkCardProps {
  row: WorkOrderRow;
  /** Off on a truck's own page, where every row is the same plate. */
  showPlate?: boolean;
}

/** One work order as a tappable row: the phone list and the car page use it. */
export function WorkOrderLinkCard({ row, showPlate = true }: WorkOrderLinkCardProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const summary = workOrderSummary(row, i18n.language);
  const work = row.title && summary ? `${row.title} — ${summary}` : (row.title ?? summary);
  const heading = showPlate ? row.plate : (row.title ?? summary);
  const detail = showPlate ? work : row.title ? summary : null;
  return (
    <Link
      to={`/work-orders/${row.id}`}
      className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      {...intentProps(() => {
        preloadChunk('work-order-details');
        prefetchWorkOrder(queryClient, row.id);
      })}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold" dir="auto">
            {heading ?? t('workOrders.untitled')}
          </span>
          <WorkOrderStatusBadge status={row.status} />
        </div>
        {detail && (
          <p className="line-clamp-2 text-xs text-muted-foreground" dir="auto">
            {detail}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t('workOrders.openedOn', { date: maintDate(row.opened_at, i18n.language) })}
          </span>
          {row.closed_at && (
            <span>
              {t('workOrders.closedOn', { date: maintDate(row.closed_at, i18n.language) })}
            </span>
          )}
          {row.odometer !== null && (
            <span className="tabular-nums">
              {formatNumber(row.odometer)} {t('common.unit.km')}
            </span>
          )}
          {row.task_count > 0 && <WorkOrderProgress row={row} />}
          <WorkOrderOpenedBy row={row} />
        </div>
        <WorkOrderExtras row={row} />
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
    </Link>
  );
}
