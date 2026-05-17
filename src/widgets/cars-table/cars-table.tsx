import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Car as CarIcon,
  Plus,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Gauge,
  Edit,
  User,
} from 'lucide-react';
import type { Car } from '@/entities/car/schemas';
import { useCars } from '@/entities/car/queries';
import { DataTable } from '@/shared/ui/data-table';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';
import { matches } from '@/shared/lib/normalize';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { useDrivers } from '@/entities/driver/queries';

interface CarsTableProps {
  onAddCar?: () => void;
  onEditCar?: (car: Car) => void;
}

export function CarsTable({ onAddCar, onEditCar }: CarsTableProps) {
  const { t } = useTranslation();
  const { data: cars = [], isLoading } = useCars();
  const { data: drivers = [] } = useDrivers();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  const [search, setSearch] = React.useState('');

  const getDriverName = React.useCallback((car: Car) => {
    if (car.driver?.name) return car.driver.name;
    if (!car.driver_id) return t('cars.noDriver');
    const driver = drivers.find((d) => d.ID === car.driver_id);
    return driver?.name || t('common.unknown');
  }, [drivers, t]);

  const isExpired = (dateString: string | null | undefined) => {
    if (!dateString) return false;
    try {
      return new Date(dateString) < new Date();
    } catch {
      return false;
    }
  };

  const isExpiringSoon = (dateString: string | null | undefined) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    } catch {
      return false;
    }
  };

  const hasExpiredDocs = React.useCallback((car: Car) => {
    return (
      isExpired(car.license_expiration_date) ||
      isExpired(car.calibration_expiration_date) ||
      ((car.car_type === 'Trailer' || car.car_type === 'Truck') && isExpired(car.tank_license_expiration_date))
    );
  }, []);

  const hasExpiringSoonDocs = React.useCallback((car: Car) => {
    if (hasExpiredDocs(car)) return false;
    return (
      isExpiringSoon(car.license_expiration_date) ||
      isExpiringSoon(car.calibration_expiration_date) ||
      ((car.car_type === 'Trailer' || car.car_type === 'Truck') && isExpiringSoon(car.tank_license_expiration_date))
    );
  }, [hasExpiredDocs]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return cars;
    return cars.filter(
      (c) =>
        matches(c.car_no_plate, search) ||
        matches(c.car_type, search) ||
        matches(getDriverName(c), search)
    );
  }, [cars, search, getDriverName]);

  const stats = React.useMemo(() => {
    const total = cars.length;
    const assigned = cars.filter((c) => c.driver_id).length;
    const expired = cars.filter(hasExpiredDocs).length;
    const expiringSoon = cars.filter(hasExpiringSoonDocs).length;
    return { total, assigned, expired, expiringSoon };
  }, [cars, hasExpiredDocs, hasExpiringSoonDocs]);

  const columns = React.useMemo<ColumnDef<Car, unknown>[]>(
    () => [
      {
        accessorKey: 'car_no_plate',
        header: t('cars.fields.plateNumber', 'Plate Number'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CarIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.car_no_plate}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="h-3 w-3" />
                {row.original.car_type}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'driver',
        header: t('cars.fields.driver'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {getDriverName(row.original)}
          </div>
        ),
      },
      {
        accessorKey: 'tank_capacity',
        header: t('cars.fields.capacity'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            {row.original.tank_capacity?.toLocaleString()} L
          </div>
        ),
      },
      {
        id: 'status',
        header: t('common.status'),
        cell: ({ row }) => {
          const car = row.original;
          if (hasExpiredDocs(car)) {
            return (
              <Badge variant="destructive">
                <ShieldAlert className="h-3 w-3 mr-1" />
                {t('cars.status.expired')}
              </Badge>
            );
          }
          if (hasExpiringSoonDocs(car)) {
            return (
              <Badge variant="warning">
                <Clock className="h-3 w-3 mr-1" />
                {t('cars.status.expiring')}
              </Badge>
            );
          }
          return (
            <Badge variant="success">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {t('cars.status.valid')}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEditCar?.(row.original);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, getDriverName, onEditCar, hasExpiredDocs, hasExpiringSoonDocs]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('cars.stats.total')}
          value={stats.total}
          icon={CarIcon}
          tone="primary"
        />
        <StatCard
          label={t('cars.stats.assigned')}
          value={stats.assigned}
          icon={User}
          tone="success"
        />
        <StatCard
          label={t('cars.stats.expiring')}
          value={stats.expiringSoon}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label={t('cars.stats.expired')}
          value={stats.expired}
          icon={ShieldAlert}
          tone="destructive"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          id="cars-search"
          value={search}
          onChange={setSearch}
          placeholder={t('cars.searchPlaceholder')}
          className="max-w-sm"
        />
        {canManage && onAddCar && (
          <Button onClick={onAddCar}>
            <Plus className="h-4 w-4 mr-2" />
            {t('cars.addCar')}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        emptyState={
          <EmptyState
            lottieSrc="/animations/no_results.json"
            lottieWidth={100}
            lottieHeight={100}
            title={t('cars.noCars')}
            description={t('cars.noCarsDescription')}
            action={
              canManage && onAddCar ? (
                <Button onClick={onAddCar}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('cars.addCar')}
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
