import { useTranslation } from 'react-i18next';
import type { DropOffPoint } from '@/entities/location/schemas';
import { DataTable } from '@/shared/ui/data-table';
import { useDropoffColumns } from './columns';

interface LocationsDropoffsTableProps {
  dropoffs: DropOffPoint[];
  loading?: boolean;
  onRowClick: (dropoff: DropOffPoint) => void;
}

export function LocationsDropoffsTable({
  dropoffs,
  loading,
  onRowClick,
}: LocationsDropoffsTableProps) {
  const { t } = useTranslation();
  const columns = useDropoffColumns();

  return (
    <DataTable
      columns={columns}
      data={dropoffs}
      loading={loading}
      onRowClick={onRowClick}
      pageSize={50}
      emptyState={t('locations.dropoffs.empty', 'No drop-off points found')}
    />
  );
}
