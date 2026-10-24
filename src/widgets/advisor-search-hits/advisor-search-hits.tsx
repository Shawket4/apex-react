import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { AdvisorSearchHit } from '@/entities/advisor';
import { prefetchServiceInvoice } from '@/entities/service-invoice/queries';
import { DataTable } from '@/shared/ui/data-table';
import { format, formatNumber } from '@/shared/lib/format';

interface AdvisorSearchHitsProps {
  hits: AdvisorSearchHit[];
  loading?: boolean;
  searchQuery: string;
}

/**
 * The AI search's fused hits: one row per matching service line, with the
 * invoice it sits on (plate, date, meter). A row opens that invoice with the
 * query highlighted, as the FalconGo results do.
 */
export function AdvisorSearchHits({ hits, loading, searchQuery }: AdvisorSearchHitsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const columns = React.useMemo<ColumnDef<AdvisorSearchHit>[]>(
    () => [
      {
        accessorKey: 'date',
        header: t('serviceInvoices.fields.date'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-mono tabular-nums">
            {format(row.original.date, 'd MMM yyyy') || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'plate_number',
        header: t('serviceInvoices.fields.plateNumber'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-semibold" dir="auto">
            {row.original.plate_number || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'service',
        header: t('serviceInvoices.fields.service'),
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <div dir="auto" className="font-medium">
              {row.original.service || '—'}
            </div>
            {row.original.matched.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {row.original.matched.map((m) => (
                  <span
                    key={m}
                    dir="auto"
                    className="rounded bg-primary/10 px-1.5 py-0.5 text-[10.5px] text-primary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'notes',
        header: t('serviceInvoices.fields.notes'),
        cell: ({ row }) => (
          <div dir="auto" className="min-w-[8rem] max-w-xs text-muted-foreground">
            {row.original.notes || '—'}
          </div>
        ),
      },
      {
        accessorKey: 'meter_reading',
        header: t('serviceInvoices.fields.meterReading'),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-end font-mono">
            {row.original.meter_reading == null
              ? '—'
              : `${formatNumber(row.original.meter_reading)} ${t('common.unit.km')}`}
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={hits}
      loading={loading}
      emptyState={t('common.noResults')}
      onRowClick={(hit) =>
        navigate(`/service-invoices/${hit.invoice_id}?query=${encodeURIComponent(searchQuery)}`)
      }
      onRowIntent={(hit) => prefetchServiceInvoice(queryClient, hit.invoice_id)}
    />
  );
}
