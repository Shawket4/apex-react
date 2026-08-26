import { useTranslation } from 'react-i18next';
import type { DropOffPoint } from '@/entities/location/schemas';
import { DataTable } from '@/shared/ui/data-table';
import { useDropoffColumns } from './columns';

interface LocationsDropoffsTableProps {
  dropoffs: DropOffPoint[];
  loading?: boolean;
  onRowClick: (dropoff: DropOffPoint) => void;
  /** Server-side pagination — the list endpoint is paginated now. */
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  pageSize?: number;
}

export function LocationsDropoffsTable({
  dropoffs,
  loading,
  onRowClick,
  pagination,
  pageSize = 50,
}: LocationsDropoffsTableProps) {
  const { t } = useTranslation();
  const columns = useDropoffColumns();

  return (
    <DataTable
      columns={columns}
      data={dropoffs}
      loading={loading}
      onRowClick={onRowClick}
      pageSize={pageSize}
      pagination={pagination}
      emptyState={t('locations.dropoffs.empty', 'No drop-off points found')}
    />
  );
}
