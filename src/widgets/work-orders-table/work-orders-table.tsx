import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { workOrderSummary } from '@/entities/maintenance/lib';
import { prefetchWorkOrder } from '@/entities/maintenance/queries';
import type { WorkOrderRow } from '@/entities/maintenance/schemas';
import { formatNumber } from '@/shared/lib/format';
import { preloadChunk } from '@/shared/lib/prefetch';
import { DataTable } from '@/shared/ui/data-table';
import { Skeleton } from '@/shared/ui/skeleton';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { Pager } from '@/widgets/maintenance/pager';
import {
  WorkOrderExtras,
  WorkOrderLinkCard,
  WorkOrderOpenedBy,
  WorkOrderProgress,
  WorkOrderStatusBadge,
} from '@/widgets/maintenance/work-order-bits';

interface WorkOrdersTableProps {
  data: WorkOrderRow[];
  loading?: boolean;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

/**
 * Work orders, read-only: a table from `md` up, a list of cards on a phone.
 * A row opens the order; there is nothing to edit here.
 */
export function WorkOrdersTable({ data, loading, pagination }: WorkOrdersTableProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const language = i18n.language;

  const columns = React.useMemo<ColumnDef<WorkOrderRow, unknown>[]>(
    () => [
      {
        accessorKey: 'plate',
        header: t('workOrders.fields.plate'),
        cell: ({ row }) => (
          <div className="font-semibold" dir="auto">
            {row.original.plate ?? <span className="opacity-40">—</span>}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('workOrders.fields.status'),
        cell: ({ row }) => <WorkOrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'opened_at',
        header: t('workOrders.fields.dates'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-xs">
            <div>{maintDate(row.original.opened_at, language)}</div>
            {row.original.closed_at && (
              <div className="text-muted-foreground">
                {t('workOrders.closedOn', { date: maintDate(row.original.closed_at, language) })}
              </div>
            )}
            <WorkOrderOpenedBy row={row.original} className="block text-muted-foreground" />
          </div>
        ),
      },
      {
        accessorKey: 'odometer',
        header: t('workOrders.fields.odometer'),
        cell: ({ row }) =>
          row.original.odometer === null ? (
            <span className="opacity-40">—</span>
          ) : (
            <div className="whitespace-nowrap font-mono tabular-nums">
              {formatNumber(row.original.odometer)} {t('common.unit.km')}
            </div>
          ),
      },
      {
        id: 'progress',
        header: t('workOrders.fields.progress'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-xs">
            <WorkOrderProgress row={row.original} />
          </div>
        ),
      },
      {
        accessorKey: 'summary',
        header: t('workOrders.fields.work'),
        cell: ({ row }) => {
          const { title } = row.original;
          const summary = workOrderSummary(row.original, language);
          if (!title && !summary) return <span className="opacity-40">—</span>;
          return (
            <div className="min-w-40 max-w-md space-y-0.5" dir="auto">
              {title && <div className="line-clamp-1 text-sm font-medium">{title}</div>}
              {summary && (
                <div className="line-clamp-2 text-xs text-muted-foreground">{summary}</div>
              )}
            </div>
          );
        },
      },
      {
        id: 'extras',
        header: t('workOrders.fields.extras'),
        cell: ({ row }) =>
          row.original.oil_liters || row.original.tire_ops ? (
            <WorkOrderExtras row={row.original} className="whitespace-nowrap" />
          ) : (
            <span className="opacity-40">—</span>
          ),
      },
    ],
    [t, language],
  );

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyState={t('workOrders.empty.title')}
          onRowClick={(row) => navigate(`/work-orders/${row.id}`)}
          onRowIntent={(row) => {
            preloadChunk('work-order-details');
            prefetchWorkOrder(queryClient, row.id);
          }}
          pagination={pagination}
        />
      </div>

      <div className="flex flex-col gap-2 p-3 md:hidden">
        {loading
          ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : data.map((row) => <WorkOrderLinkCard key={row.id} row={row} />)}
        <Pager {...pagination} className="pt-1" />
      </div>
    </>
  );
}
