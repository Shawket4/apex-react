import { Edit, MoreHorizontal, Trash2, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Zone } from '@/entities/zone/schemas';
import { Button } from '@/shared/ui/button';
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

export function ZoneActions({ zone, onEdit, onToggleActive, onDelete }: ZoneActionsProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t('common.actions')}
          title={t('common.actions')}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onEdit(zone)}>
          <Edit className="me-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('common.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(zone)}>
          <Power className="me-2 h-3.5 w-3.5" aria-hidden="true" />
          {zone.active ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => onDelete(zone)}
        >
          <Trash2 className="me-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
