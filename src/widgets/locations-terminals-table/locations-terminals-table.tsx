import { useTranslation } from 'react-i18next';
import type { Terminal } from '@/entities/location/schemas';
import { DataTable } from '@/shared/ui/data-table';
import { useTerminalColumns } from './columns';

interface LocationsTerminalsTableProps {
  terminals: Terminal[];
  loading?: boolean;
  onRowClick: (terminal: Terminal) => void;
}

export function LocationsTerminalsTable({
  terminals,
  loading,
  onRowClick,
}: LocationsTerminalsTableProps) {
  const { t } = useTranslation();
  const columns = useTerminalColumns();

  return (
    <DataTable
      columns={columns}
      data={terminals}
      loading={loading}
      onRowClick={onRowClick}
      pageSize={50}
      emptyState={t('locations.terminals.empty', 'No terminals found')}
    />
  );
}
