import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleDot, Search } from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import { pageCount, tireStatusTabs, totalOf } from '@/entities/maintenance/lib';
import { useMaintTires } from '@/entities/maintenance/queries';
import type { MaintTire } from '@/entities/maintenance/schemas';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { formatNumber } from '@/shared/lib/format';
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

function tireName(tire: MaintTire): string {
  return [tire.brand, tire.model].filter(Boolean).join(' ');
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant =
    status === 'mounted'
      ? 'success'
      : status === 'scrapped'
        ? 'destructive'
        : status === 'in_repair' || status === 'retreading'
          ? 'warning'
          : 'secondary';
  return (
    <Badge variant={variant} className="shrink-0">
      {t(`maintenance.tireStatus.${status}`, { defaultValue: status })}
    </Badge>
  );
}

/** Where a tire is: its truck (a link to the car page) and wheel position. */
function Where({ tire }: { tire: MaintTire }) {
  if (tire.vehicle_id === null && !tire.plate) return DASH;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {tire.vehicle_id !== null ? (
        <Link
          to={`/cars/${tire.vehicle_id}?tab=maintenance`}
          className="font-medium text-primary underline-offset-4 hover:underline"
          dir="auto"
        >
          {tire.plate ?? `#${tire.vehicle_id}`}
        </Link>
      ) : (
        <span dir="auto">{tire.plate}</span>
      )}
      {tire.position_code && (
        <span className="text-xs text-muted-foreground" dir="ltr">
          {tire.position_code}
        </span>
      )}
    </span>
  );
}

function TireCard({ tire }: { tire: MaintTire }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-1.5 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold" dir="ltr">
          {tireName(tire) || t('maintenance.tires.unnamed')}
        </span>
        <StatusBadge status={tire.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {tire.size && <span dir="ltr">{tire.size}</span>}
        {tire.dot_code && <span dir="ltr">DOT {tire.dot_code}</span>}
        {tire.total_km !== null && (
          <span className="tabular-nums">
            {formatNumber(tire.total_km)} {t('common.unit.km')}
          </span>
        )}
        {!!tire.retread_count && (
          <span>{t('maintenance.tires.retreads', { n: tire.retread_count })}</span>
        )}
      </div>
      {(tire.vehicle_id !== null || tire.plate) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Where tire={tire} />
          {tire.mounted_at && (
            <span className="text-muted-foreground">
              {t('maintenance.tires.fittedOn', { date: maintDate(tire.mounted_at, i18n.language) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Every tire the garage system knows, read-only. Tires are fitted, moved and
 * scrapped in the garage app; this list only shows where each one is.
 */
export function MaintTiresList() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [status, setStatus] = React.useState<string>(ALL);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const debounced = useDebounce(search, 400).trim();

  React.useEffect(() => {
    setPage(1);
  }, [status, debounced]);

  const { data, isLoading, isError, isFetching, refetch } = useMaintTires({
    ...(status !== ALL ? { status } : {}),
    ...(debounced ? { q: debounced } : {}),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const columns = React.useMemo<ColumnDef<MaintTire, unknown>[]>(
    () => [
      {
        id: 'tire',
        header: t('maintenance.tires.tire'),
        cell: ({ row }) => (
          <div className="font-medium" dir="ltr">
            {tireName(row.original) || t('maintenance.tires.unnamed')}
          </div>
        ),
      },
      {
        accessorKey: 'size',
        header: t('maintenance.tires.size'),
        cell: ({ row }) => (row.original.size ? <span dir="ltr">{row.original.size}</span> : DASH),
      },
      {
        accessorKey: 'dot_code',
        header: t('maintenance.tires.dot'),
        cell: ({ row }) =>
          row.original.dot_code ? <span dir="ltr">{row.original.dot_code}</span> : DASH,
      },
      {
        accessorKey: 'status',
        header: t('maintenance.tires.status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'where',
        header: t('maintenance.tires.where'),
        cell: ({ row }) => <Where tire={row.original} />,
      },
      {
        accessorKey: 'mounted_at',
        header: t('maintenance.tires.fitted'),
        cell: ({ row }) =>
          row.original.mounted_at ? (
            <span className="whitespace-nowrap text-xs">
              {maintDate(row.original.mounted_at, language)}
            </span>
          ) : (
            DASH
          ),
      },
      {
        accessorKey: 'total_km',
        header: t('maintenance.tires.km'),
        cell: ({ row }) =>
          row.original.total_km === null ? (
            DASH
          ) : (
            <span className="whitespace-nowrap font-mono tabular-nums">
              {formatNumber(row.original.total_km)} {t('common.unit.km')}
            </span>
          ),
      },
      {
        accessorKey: 'retread_count',
        header: t('maintenance.tires.retreadCount'),
        cell: ({ row }) =>
          row.original.retread_count ? (
            <span className="tabular-nums">{formatNumber(row.original.retread_count)}</span>
          ) : (
            DASH
          ),
      },
    ],
    [t, language],
  );

  if (!isMaintConfigured) return <MaintNotConfigured />;

  const counts = data?.status_counts ?? {};
  const options: Array<ChipOption<string>> = [
    { value: ALL, label: t('maintenance.tireStatus.all'), count: data ? totalOf(counts) : undefined },
    ...tireStatusTabs(counts).map((value) => ({
      value,
      label: t(`maintenance.tireStatus.${value}`, { defaultValue: value }),
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
      <p className="text-xs text-muted-foreground">{t('maintenance.tires.listHint')}</p>
      <ChipRadioGroup<string>
        label={t('maintenance.tires.status')}
        value={status}
        onChange={setStatus}
        options={options}
      />
      <SearchInput
        id="maint-tires-search"
        value={search}
        onChange={setSearch}
        placeholder={t('maintenance.tires.searchPlaceholder')}
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
              <CircleDot className="h-5 w-5" aria-hidden="true" />
            )
          }
          title={
            filtered ? t('maintenance.tires.emptyFilteredTitle') : t('maintenance.tires.emptyTitle')
          }
          description={
            filtered
              ? t('maintenance.tires.emptyFilteredDescription')
              : t('maintenance.tires.emptyDescription')
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
                : rows.map((tire) => <TireCard key={tire.id} tire={tire} />)}
              <Pager {...pagination} className="pt-1" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
