import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import type { Zone } from '@/entities/zone/schemas';
import { Badge } from '@/shared/ui/badge';
import { ZoneActions } from './zone-actions';

export function useZoneColumns({
  onEdit,
  onToggleActive,
  onDelete,
}: {
  onEdit: (zone: Zone) => void;
  onToggleActive: (zone: Zone) => void;
  onDelete: (zone: Zone) => void;
}): ColumnDef<Zone>[] {
  const { t } = useTranslation();

  return React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('zones.fields.name', 'Name'),
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: 'lat',
        header: t('zones.fields.lat', 'Latitude'),
        cell: ({ row }) => <div className="text-muted-foreground font-mono tabular-nums">{row.original.lat.toFixed(6)}</div>,
      },
      {
        accessorKey: 'lng',
        header: t('zones.fields.lng', 'Longitude'),
        cell: ({ row }) => <div className="text-muted-foreground font-mono tabular-nums">{row.original.lng.toFixed(6)}</div>,
      },
      {
        accessorKey: 'radius_m',
        header: t('zones.fields.radius', 'Radius (m)'),
        cell: ({ row }) => <div className="text-muted-foreground font-mono tabular-nums">{row.original.radius_m}</div>,
      },
      {
        accessorKey: 'active',
        header: t('zones.fields.status', 'Status'),
        cell: ({ row }) => {
          const active = row.original.active;
          return (
            <Badge variant={active ? 'success' : 'secondary'}>
              {active ? t('zones.status.active', 'Active') : t('zones.status.inactive', 'Inactive')}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <ZoneActions
            zone={row.original}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [t, onEdit, onToggleActive, onDelete]
  );
}
