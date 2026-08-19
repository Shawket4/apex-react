import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/badge';
import { isValidCoordinate } from '@/shared/lib/coords';
import { TERMINAL_DEFAULT_RADIUS_M, type Terminal } from '@/entities/location/schemas';

const MAX_ALIAS_CHIPS = 3;

export function useTerminalColumns(): ColumnDef<Terminal>[] {
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
        accessorKey: 'address',
        header: t('locations.fields.address', 'Address'),
        cell: ({ row }) => (
          <div className="max-w-[280px] truncate text-muted-foreground" dir="auto">
            {row.original.address || '—'}
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
                    m: TERMINAL_DEFAULT_RADIUS_M,
                    defaultValue: 'Default ({{m}} m)',
                  })}
            </div>
          );
        },
      },
      {
        id: 'aliases',
        header: t('locations.fields.aliases', 'Aliases'),
        cell: ({ row }) => {
          const aliases = row.original.aliases;
          if (!aliases.length) {
            return <span className="text-muted-foreground">—</span>;
          }
          const shown = aliases.slice(0, MAX_ALIAS_CHIPS);
          const extra = aliases.length - shown.length;
          return (
            <div className="flex max-w-[320px] flex-wrap gap-1">
              {shown.map((alias) => (
                <Badge key={alias.ID} variant="secondary" dir="auto">
                  {alias.alias}
                </Badge>
              ))}
              {extra > 0 && <Badge variant="outline">+{extra}</Badge>}
            </div>
          );
        },
      },
    ],
    [t],
  );
}
