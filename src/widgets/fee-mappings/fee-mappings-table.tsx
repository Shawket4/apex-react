import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { formatNumber, formatCurrency } from '@/shared/lib/format';
import { isValidCoordinate } from '@/shared/lib/coords';
import {
  calculateAccuracy,
  type FeeMapping,
} from '@/entities/fee-mapping/schemas';
import { AccuracyBadge } from './accuracy-badge';

interface FeeMappingsTableProps {
  mappings: FeeMapping[];
  loading?: boolean;
  onEdit: (m: FeeMapping) => void;
  onDelete: (m: FeeMapping) => void;
  onSetLocation: (m: FeeMapping) => void;
}

/**
 * Fee mappings table.
 *
 * Built on shared DataTable so it gets the same sorting / pagination /
 * filtering as every other table in the app. The accuracy column is
 * sortable on the absolute diff so users can quickly find the worst
 * overestimates / undershoots.
 */
export function FeeMappingsTable({
  mappings,
  loading,
  onEdit,
  onDelete,
  onSetLocation,
}: FeeMappingsTableProps) {
  const { t } = useTranslation();

  const columns = React.useMemo<ColumnDef<FeeMapping>[]>(() => [
    {
      accessorKey: 'company',
      header: () => <span>{t('feeMappings.fields.company')}</span>,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.company}</span>
      ),
    },
    {
      accessorKey: 'terminal',
      header: () => <span>{t('feeMappings.fields.terminal')}</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.terminal}</span>
      ),
    },
    {
      accessorKey: 'dropOffPoint',
      header: () => <span>{t('feeMappings.fields.dropOffPoint')}</span>,
      cell: ({ row }) => (
        <span className="block max-w-[180px] truncate" title={row.original.dropOffPoint}>
          {row.original.dropOffPoint}
        </span>
      ),
    },
    {
      accessorKey: 'distance',
      header: () => (
        <span className="block text-end">{t('feeMappings.fields.distanceShort')}</span>
      ),
      cell: ({ row }) => (
        <span className="block text-end font-mono tabular-nums">
          {formatNumber(row.original.distance, 2)}
        </span>
      ),
      meta: { align: 'end' },
    },
    {
      id: 'osrmDistance',
      accessorFn: (m) => m.osrmDistanceKm ?? -Infinity,
      header: () => (
        <span className="block text-end">{t('feeMappings.fields.osrmDistance')}</span>
      ),
      cell: ({ row }) => {
        const v = row.original.osrmDistanceKm;
        return (
          <span className="block text-end font-mono tabular-nums text-muted-foreground">
            {v != null ? formatNumber(v, 2) : '—'}
          </span>
        );
      },
      meta: { align: 'end' },
    },
    {
      id: 'osrmDuration',
      accessorFn: (m) => m.osrmDurationMin ?? -Infinity,
      header: () => (
        <span className="block text-end">{t('feeMappings.fields.osrmDuration')}</span>
      ),
      cell: ({ row }) => {
        const v = row.original.osrmDurationMin;
        return (
          <span className="block text-end font-mono tabular-nums text-muted-foreground">
            {v != null ? `${v.toFixed(0)} min` : '—'}
          </span>
        );
      },
      meta: { align: 'end' },
    },
    {
      id: 'accuracy',
      // Sort by absolute diff so worst-first sorting surfaces both extremes
      accessorFn: (m) => {
        const { diffKm, kind } = calculateAccuracy(m.distance, m.osrmDistanceKm);
        return kind === 'unknown' ? -1 : Math.abs(diffKm);
      },
      header: () => <span>{t('feeMappings.fields.accuracy')}</span>,
      cell: ({ row }) => {
        const { kind, diffKm } = calculateAccuracy(
          row.original.distance,
          row.original.osrmDistanceKm,
        );
        return <AccuracyBadge kind={kind} diffKm={diffKm} />;
      },
    },
    {
      accessorKey: 'fee',
      header: () => (
        <span className="block text-end">{t('feeMappings.fields.fee')}</span>
      ),
      cell: ({ row }) => (
        <span className="block text-end font-semibold tabular-nums">
          {formatCurrency(row.original.fee)}
        </span>
      ),
      meta: { align: 'end' },
    },
    {
      id: 'actions',
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => {
        const m = row.original;
        const hasLoc = isValidCoordinate(m.lat, m.lng);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className={
                hasLoc
                  ? 'h-7 w-7 text-success hover:bg-success/10 hover:text-success'
                  : 'h-7 w-7 text-muted-foreground hover:bg-muted'
              }
              onClick={() => onSetLocation(m)}
              title={
                hasLoc
                  ? t('feeMappings.actions.updateLocation')
                  : t('feeMappings.actions.setLocation')
              }
            >
              <MapPin className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-primary hover:bg-primary/10"
              onClick={() => onEdit(m)}
              title={t('common.edit')}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(m)}
              title={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
      meta: { align: 'end' },
    },
  ], [t, onEdit, onDelete, onSetLocation]);

  return (
    <DataTable
      columns={columns}
      data={mappings}
      loading={loading}
      pageSize={50}
    />
  );
}
