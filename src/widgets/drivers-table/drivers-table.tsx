import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Users,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Truck,
} from 'lucide-react';
import type { Driver } from '@/entities/driver/schemas';
import { useDriverProfiles } from '@/entities/driver/queries';
import { DataTable } from '@/shared/ui/data-table';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';
import { matches } from '@/shared/lib/normalize';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';

interface DriversTableProps {
  onAddDriver?: () => void;
}

export function DriversTable({ onAddDriver }: DriversTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: drivers = [], isLoading } = useDriverProfiles();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  const [search, setSearch] = React.useState('');

  // Filtered data using comprehensive normalization
  const filtered = React.useMemo(() => {
    if (!search.trim()) return drivers;
    return drivers.filter(
      (d) =>
        matches(d.name, search) ||
        matches(d.mobile_number, search) ||
        matches(d.transporter, search),
    );
  }, [drivers, search]);

  // Stats
  const stats = React.useMemo(() => {
    const total = drivers.length;
    const approved = drivers.filter((d) => d.is_approved).length;
    const pending = total - approved;
    return { total, approved, pending };
  }, [drivers]);

  // Column definitions
  const columns = React.useMemo<ColumnDef<Driver, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('drivers.fields.name'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.name}</p>
              {row.original.mobile_number && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {row.original.mobile_number}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'transporter',
        header: t('drivers.fields.transporter'),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            {row.original.transporter || 'Apex'}
          </div>
        ),
      },
      {
        accessorKey: 'is_approved',
        header: t('common.status'),
        cell: ({ row }) => {
          const approved = row.original.is_approved;
          return approved ? (
            <Badge variant="success">
              <ShieldCheck className="h-3 w-3" />
              {t('drivers.status.approved')}
            </Badge>
          ) : (
            <Badge variant="warning">
              <ShieldAlert className="h-3 w-3" />
              {t('drivers.status.pending')}
            </Badge>
          );
        },
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('drivers.stats.total')}
          value={stats.total}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label={t('drivers.stats.approved')}
          value={stats.approved}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label={t('drivers.stats.pending')}
          value={stats.pending}
          icon={ShieldAlert}
          tone="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          id="drivers-search"
          value={search}
          onChange={setSearch}
          placeholder={t('drivers.searchPlaceholder')}
          className="max-w-sm"
        />
        {canManage && onAddDriver && (
          <Button onClick={onAddDriver} id="add-driver-btn">
            <Plus className="h-4 w-4" />
            {t('drivers.addDriver')}
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        onRowClick={(row) => navigate(`/drivers/${row.ID}`)}
        emptyState={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t('drivers.noDrivers')}
            description={t('drivers.noDriversDescription')}
            action={
              canManage && onAddDriver ? (
                <Button onClick={onAddDriver}>
                  <Plus className="h-4 w-4" />
                  {t('drivers.addDriver')}
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}