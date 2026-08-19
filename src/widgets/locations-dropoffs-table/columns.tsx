import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/badge';
import { isValidCoordinate } from '@/shared/lib/coords';
import { DROPOFF_DEFAULT_RADIUS_M, type DropOffPoint } from '@/entities/location/schemas';
import { PinSourceBadge } from './pin-source-badge';

export function useDropoffColumns(): ColumnDef<DropOffPoint>[] {
  const { t } = useTranslation();

  return React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('locations.fields.name', 'Name'),
        cell: ({ row }) => (
          <div className="font-medium" dir="auto">
            {row.original.name}
          </div>
        ),
      },
      {
        id: 'pin',
        header: t('locations.fields.pinStatus', 'Pin'),
        cell: ({ row }) => {
          const pinned = isValidCoordinate(row.original.lat, row.original.long);
          return (
            <Badge variant={pinned ? 'success' : 'warning'}>
              {pinned
                ? t('locations.pin.pinned', 'Pinned')
                : t('locations.pin.missing', 'No pin')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'radius_m',
        header: t('locations.fields.radius', 'Radius (m)'),
        cell: ({ row }) => {
          const radius = row.original.radius_m;
          return (
            <div className="text-muted-foreground tabular-nums">
              {radius != null
                ? radius
                : t('locations.fields.radiusDefaultPlaceholder', {
                    m: DROPOFF_DEFAULT_RADIUS_M,
                    defaultValue: 'Default ({{m}} m)',
                  })}
            </div>
          );
        },
      },
      {
        accessorKey: 'pin_source',
        header: t('locations.fields.pinSource', 'Pin source'),
        cell: ({ row }) =>
          row.original.pin_source ? (
            <PinSourceBadge pinSource={row.original.pin_source} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'coords',
        header: t('locations.fields.coordinates', 'Coordinates'),
        cell: ({ row }) => {
          const { lat, long } = row.original;
          if (!isValidCoordinate(lat, long)) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="text-muted-foreground tabular-nums" dir="ltr">
              {Number(lat).toFixed(5)}, {Number(long).toFixed(5)}
            </div>
          );
        },
      },
    ],
    [t],
  );
}
