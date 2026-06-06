import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit, MoreHorizontal, Trash2, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Zone } from '@/entities/zone/schemas';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface ZoneActionsProps {
  zone: Zone;
  onEdit: (zone: Zone) => void;
  onToggleActive: (zone: Zone) => void;
  onDelete: (zone: Zone) => void;
}

function ZoneActions({ zone, onEdit, onToggleActive, onDelete }: ZoneActionsProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onEdit(zone)}>
          <Edit className="mr-2 h-3.5 w-3.5" />
          {t('common.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(zone)}>
          <Power className="mr-2 h-3.5 w-3.5" />
          {zone.active ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => onDelete(zone)}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
        cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.lat.toFixed(6)}</div>,
      },
      {
        accessorKey: 'lng',
        header: t('zones.fields.lng', 'Longitude'),
        cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.lng.toFixed(6)}</div>,
      },
      {
        accessorKey: 'radius_m',
        header: t('zones.fields.radius', 'Radius (m)'),
        cell: ({ row }) => <div className="text-muted-foreground tabular-nums">{row.original.radius_m}</div>,
      },
      {
        accessorKey: 'active',
        header: t('zones.fields.status', 'Status'),
        cell: ({ row }) => {
          const active = row.original.active;
          return (
            <Badge variant={active ? 'success' : 'secondary'} className={!active ? 'opacity-50' : ''}>
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
