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
import { useIsMobile } from '@/shared/hooks/use-media-query';
import {
  CAR_DOCUMENT_KINDS,
  carDocumentState,
  documentApplies,
  documentState,
  daysUntil,
} from '@/entities/car/expiry';
import { CarDocumentCell } from './car-document-cell';
import { CarsMobileList } from './cars-mobile-list';

/** Which API field each dated paper lives in. */
const FIELD = {
  license: 'license_expiration_date',
  calibration: 'calibration_expiration_date',
  tank_license: 'tank_license_expiration_date',
} as const;

interface CarsTableProps {
  onAddCar?: () => void;
  onEditCar?: (car: Car) => void;
}

export function CarsTable({ onAddCar, onEditCar }: CarsTableProps) {
  const { t } = useTranslation();
  const { data: cars = [], isLoading } = useCars();
  const { data: drivers = [] } = useDrivers();
  const { atLeast } = usePermissions();
  const isMobile = useIsMobile();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  const [search, setSearch] = React.useState('');

  const getDriverName = React.useCallback((car: Car) => {
    if (car.driver?.name) return car.driver.name;
    if (!car.driver_id) return t('cars.noDriver');
    const driver = drivers.find((d) => d.ID === car.driver_id);
    return driver?.name || t('common.unknown');
  }, [drivers, t]);

  // The expiry rules live in entities/car/expiry.ts now: this screen used a
  // 30-day window while the dashboard used 60, so a licence with six weeks left
  // was flagged on one and silent on the other.
  const hasExpiredDocs = React.useCallback(
    (car: Car) => carDocumentState(car) === 'expired',
    [],
  );

  const hasExpiringSoonDocs = React.useCallback(
    (car: Car) => carDocumentState(car) === 'expiring',
    [],
  );

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
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CarIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium tabular-nums" dir="auto">{row.original.car_no_plate}</p>
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
            <span className="font-mono tabular-nums">{row.original.tank_capacity?.toLocaleString()}</span> {t('cars.units.litre', 'L')}
          </div>
        ),
      },
      // One column per dated paper. They were folded into a single status badge
      // that said something had lapsed without saying which, so renewing
      // anything meant opening the vehicle to find out.
      ...CAR_DOCUMENT_KINDS.map<ColumnDef<Car, unknown>>((kind) => ({
        id: kind,
        header: t(`cars.documents.${kind}`),
        // Sort by time remaining, not by the date string: the question is
        // always what lapses next, and a missing date sorts last rather than
        // pretending to be the year 1970.
        accessorFn: (car: Car) =>
          documentApplies(car, kind) ? (daysUntil(car[FIELD[kind]]) ?? Infinity) : Infinity,
        cell: ({ row }) => {
          const car = row.original;
          if (!documentApplies(car, kind)) {
            return <span className="text-xs text-muted-foreground opacity-40">—</span>;
          }
          const value = car[FIELD[kind]];
          return (
            <CarDocumentCell
              doc={{ kind, value, state: documentState(value), days: daysUntil(value) }}
            />
          );
        },
      })),
      {
        id: 'status',
        header: t('common.status'),
        cell: ({ row }) => {
          const state = carDocumentState(row.original);
          const Icon =
            state === 'expired' ? ShieldAlert : state === 'expiring' ? Clock : ShieldCheck;
          return (
            <Badge
              variant={
                state === 'expired'
                  ? 'destructive'
                  : state === 'expiring'
                    ? 'warning'
                    : state === 'missing'
                      ? 'secondary'
                      : 'success'
              }
            >
              <Icon className="h-3 w-3" />
              {t(`cars.status.${state}`)}
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
              aria-label={t('cars.editCar')}
              title={t('cars.editCar')}
              onClick={(e) => {
                e.stopPropagation();
                onEditCar?.(row.original);
              }}
            >
              <Edit />
            </Button>
          </div>
        ),
      },
    ],
    [t, getDriverName, onEditCar]
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            <Plus />
            {t('cars.addCar')}
          </Button>
        )}
      </div>

      {/* A seven-column table with three date pairs does not survive a phone,
          so the same rows render as cards there -- the split trips and oil
          changes already use. */}
      {isMobile ? (
        <CarsMobileList
          cars={filtered}
          loading={isLoading}
          driverName={getDriverName}
          onEditCar={canManage ? onEditCar : undefined}
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
                  <Plus />
                  {t('cars.addCar')}
                </Button>
              ) : undefined
            }
          />}
        />
      ) : (
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
                    <Plus />
                    {t('cars.addCar')}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </div>
  );
}
