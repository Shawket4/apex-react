
import type { Zone } from '@/entities/zone/schemas';
import { DataTable } from '@/shared/ui/data-table';
import { useZoneColumns } from './columns';

interface ZonesTableProps {
  zones: Zone[];
  loading?: boolean;
  onEdit: (zone: Zone) => void;
  onToggleActive: (zone: Zone) => void;
  onDelete: (zone: Zone) => void;
}

export function ZonesTable({
  zones,
  loading,
  onEdit,
  onToggleActive,
  onDelete,
}: ZonesTableProps) {
  const columns = useZoneColumns({
    onEdit,
    onToggleActive,
    onDelete,
  });

  return (
    <DataTable
      columns={columns}
      data={zones}
      loading={loading}
      pageSize={100}
    />
  );
}
