import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { BatteryFull, Search } from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import {
  batterySpec,
  batteryStatusTabs,
  digits,
  pageCount,
  totalOf,
  warrantyOver,
} from '@/entities/maintenance/lib';
import { useMaintBatteries } from '@/entities/maintenance/queries';
import type { MaintBattery } from '@/entities/maintenance/schemas';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { ChipRadioGroup, type ChipOption } from '@/shared/ui/chip-group';
import { DataTable } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { SearchInput } from '@/shared/ui/search-input';
import { Skeleton } from '@/shared/ui/skeleton';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { MaintError, MaintNotConfigured } from '@/widgets/maintenance/maint-states';
import { Pager } from '@/widgets/maintenance/pager';

const PAGE_SIZE = 50;
const ALL = 'all';
const DASH = <span className="opacity-40">—</span>;

function batteryName(battery: MaintBattery): string {
  return [battery.brand, battery.model].filter(Boolean).join(' ');
}

function BatteryStatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  if (!status) return DASH;
  const variant =
    status === 'installed'
      ? 'success'
      : status === 'scrapped'
        ? 'destructive'
        : status === 'charging' || status === 'warranty'
          ? 'warning'
          : 'secondary';
  return (
    <Badge variant={variant} className="shrink-0">
      {t(`maintenance.batteryStatus.${status}`, { defaultValue: status })}
    </Badge>
  );
}

/** Where a battery is: its truck (a link to the car page) and slot. */
function Where({ battery }: { battery: MaintBattery }) {
  const { t, i18n } = useTranslation();
  if (battery.vehicle_id === null && !battery.plate) return DASH;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {battery.vehicle_id !== null ? (
        <Link
          to={`/cars/${battery.vehicle_id}?tab=maintenance`}
          className="font-medium text-primary underline-offset-4 hover:underline"
          dir="auto"
        >
          {battery.plate ?? `#${battery.vehicle_id}`}
        </Link>
      ) : (
        <span dir="auto">{battery.plate}</span>
      )}
      {battery.slot !== null && (
        <span className="text-xs text-muted-foreground">
          {t('maintenance.batteries.slot', { n: digits(battery.slot, i18n.language) })}
        </span>
      )}
    </span>
  );
}

/** The warranty end, loud once it has passed. */
function WarrantyUntil({ until }: { until: string | null }) {
  const { t, i18n } = useTranslation();
  if (!until) return DASH;
  const over = warrantyOver(until);
  return (
    <span
      className={cn('whitespace-nowrap text-xs', over && 'font-medium text-destructive')}
      title={over ? t('maintenance.batteries.warrantyOver') : undefined}
    >
      {maintDate(until, i18n.language)}
      {over && <span className="sr-only"> ({t('maintenance.batteries.warrantyOver')})</span>}
    </span>
  );
}

function BatteryCard({ battery }: { battery: MaintBattery }) {
  const { t, i18n } = useTranslation();
  const spec = batterySpec(battery, { cca: true });
  const over = warrantyOver(battery.warranty_until);
  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold" dir="ltr">
          {batteryName(battery) || t('maintenance.batteries.unnamed')}
        </span>
        <BatteryStatusBadge status={battery.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {spec && <span dir="ltr">{spec}</span>}
        {battery.serial && (
          <span>
            {t('maintenance.batteries.serial')}: <bdi dir="ltr">{battery.serial}</bdi>
          </span>
        )}
        {battery.date_code && (
          <span>
            {t('maintenance.batteries.dateCode')}: <bdi dir="ltr">{battery.date_code}</bdi>
          </span>
        )}
      </div>
      {(battery.vehicle_id !== null || battery.plate) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Where battery={battery} />
          {battery.installed_at && (
            <span className="text-muted-foreground">
              {t('maintenance.batteries.fittedOn', {
                date: maintDate(battery.installed_at, i18n.language),
              })}
            </span>
          )}
        </div>
      )}
      {battery.warranty_until && (
        <div className={cn('text-xs', over ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {over
            ? t('maintenance.batteries.warrantyOver')
            : t('maintenance.batteries.warrantyUntil')}
          {': '}
          {maintDate(battery.warranty_until, i18n.language)}
        </div>
      )}
    </div>
  );
}

/**
 * Every battery the garage keeps a record of, read-only. Batteries are
 * fitted, moved and removed in the garage app; this list only shows where
 * each one is. New ones still on the shelf are a count on the stock tab.
 */
export function MaintBatteriesList() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [status, setStatus] = React.useState<string>(ALL);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const debounced = useDebounce(search, 400).trim();

  React.useEffect(() => {
    setPage(1);
  }, [status, debounced]);

  const { data, isLoading, isError, isFetching, refetch } = useMaintBatteries({
    ...(status !== ALL ? { status } : {}),
    ...(debounced ? { q: debounced } : {}),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const columns = React.useMemo<ColumnDef<MaintBattery, unknown>[]>(
    () => [
      {
        id: 'battery',
        header: t('maintenance.batteries.battery'),
        cell: ({ row }) => (
          <div className="font-medium" dir="ltr">
            {batteryName(row.original) || t('maintenance.batteries.unnamed')}
          </div>
        ),
      },
      {
        id: 'spec',
        header: t('maintenance.batteries.spec'),
        cell: ({ row }) => {
          const spec = batterySpec(row.original, { cca: true });
          return spec ? (
            <span className="whitespace-nowrap" dir="ltr">
              {spec}
            </span>
          ) : (
            DASH
          );
        },
      },
      {
        accessorKey: 'serial',
        header: t('maintenance.batteries.serial'),
        cell: ({ row }) =>
          row.original.serial ? <span dir="ltr">{row.original.serial}</span> : DASH,
      },
      {
        accessorKey: 'date_code',
        header: t('maintenance.batteries.dateCode'),
        cell: ({ row }) =>
          row.original.date_code ? <span dir="ltr">{row.original.date_code}</span> : DASH,
      },
      {
        accessorKey: 'status',
        header: t('maintenance.batteries.status'),
        cell: ({ row }) => <BatteryStatusBadge status={row.original.status} />,
      },
      {
        id: 'where',
        header: t('maintenance.batteries.where'),
        cell: ({ row }) => <Where battery={row.original} />,
      },
      {
        accessorKey: 'installed_at',
        header: t('maintenance.batteries.fitted'),
        cell: ({ row }) =>
          row.original.installed_at ? (
            <span className="whitespace-nowrap text-xs">
              {maintDate(row.original.installed_at, language)}
            </span>
          ) : (
            DASH
          ),
      },
      {
        accessorKey: 'warranty_until',
        header: t('maintenance.batteries.warrantyUntil'),
        cell: ({ row }) => <WarrantyUntil until={row.original.warranty_until} />,
      },
    ],
    [t, language],
  );

  if (!isMaintConfigured) return <MaintNotConfigured />;

  const counts = data?.status_counts ?? {};
  const options: Array<ChipOption<string>> = [
    {
      value: ALL,
      label: t('maintenance.batteryStatus.all'),
      count: data ? totalOf(counts) : undefined,
    },
    ...batteryStatusTabs(counts).map((value) => ({
      value,
      label: t(`maintenance.batteryStatus.${value}`, { defaultValue: value }),
      count: data ? (counts[value] ?? 0) : undefined,
    })),
  ];

  const rows = data?.rows ?? [];
  const filtered = status !== ALL || !!debounced;
  const clearFilters = () => {
    setStatus(ALL);
    setSearch('');
  };
  const pagination = {
    page,
    totalPages: pageCount(data?.total ?? 0, PAGE_SIZE),
    onPageChange: setPage,
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t('maintenance.batteries.listHint')}</p>
      <ChipRadioGroup<string>
        label={t('maintenance.batteries.status')}
        value={status}
        onChange={setStatus}
        options={options}
      />
      <SearchInput
        id="maint-batteries-search"
        value={search}
        onChange={setSearch}
        placeholder={t('maintenance.batteries.searchPlaceholder')}
        className="flex-none"
      />

      {isError ? (
        <MaintError onRetry={() => void refetch()} retrying={isFetching} />
      ) : !isLoading && rows.length === 0 ? (
        <EmptyState
          icon={
            filtered ? (
              <Search className="h-5 w-5" aria-hidden="true" />
            ) : (
              <BatteryFull className="h-5 w-5" aria-hidden="true" />
            )
          }
          title={
            filtered
              ? t('maintenance.batteries.emptyFilteredTitle')
              : t('maintenance.batteries.emptyTitle')
          }
          description={
            filtered
              ? t('maintenance.batteries.emptyFilteredDescription')
              : t('maintenance.batteries.emptyDescription')
          }
          action={
            filtered ? (
              <Button variant="outline" onClick={clearFilters}>
                {t('common.clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={rows}
                loading={isLoading}
                pageSize={PAGE_SIZE}
                pagination={pagination}
              />
            </div>
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {isLoading
                ? Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))
                : rows.map((battery) => <BatteryCard key={battery.id} battery={battery} />)}
              <Pager {...pagination} className="pt-1" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
