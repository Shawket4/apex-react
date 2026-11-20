import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Search } from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import { pageCount } from '@/entities/maintenance/lib';
import { WORK_ORDERS_PAGE_SIZE, useWorkOrders } from '@/entities/maintenance/queries';
import type { WorkOrdersParams } from '@/entities/maintenance/schemas';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { toDateOnly } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { ChipRadioGroup } from '@/shared/ui/chip-group';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageShell } from '@/shared/ui/page-shell';
import { SearchInput } from '@/shared/ui/search-input';
import { MaintError, MaintNotConfigured } from '@/widgets/maintenance/maint-states';
import { WorkOrdersTable } from '@/widgets/work-orders-table/work-orders-table';

type StatusFilter = 'all' | 'open' | 'closed';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Work orders from the garage system, view only. The garage opens, fills and
 * closes them in its own app; the office reads them here.
 */
export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const asked = params.get('status');
  const status: StatusFilter = asked === 'open' || asked === 'closed' ? asked : 'all';
  const urlQuery = params.get('q') ?? '';
  const from = DAY.test(params.get('from') ?? '') ? params.get('from')! : undefined;
  const to = DAY.test(params.get('to') ?? '') ? params.get('to')! : undefined;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  /** Change filters in the address; any filter change returns to page one. */
  const patch = React.useCallback(
    (changes: Record<string, string | undefined>, keepPage = false) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (!keepPage) next.delete('page');
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // The box is typed into locally; the address (and the request) follow once
  // the typing pauses, so a plate is one request, not one per letter.
  const [search, setSearch] = React.useState(urlQuery);
  const debounced = useDebounce(search, 400);
  React.useEffect(() => {
    if (debounced.trim() !== urlQuery) patch({ q: debounced.trim() || undefined });
    // Only a settled search term moves the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query: WorkOrdersParams = {
    ...(status !== 'all' ? { status } : {}),
    ...(urlQuery ? { q: urlQuery } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    limit: WORK_ORDERS_PAGE_SIZE,
    offset: (page - 1) * WORK_ORDERS_PAGE_SIZE,
  };
  const { data, isLoading, isError, isFetching, refetch } = useWorkOrders(query);

  const filtered = status !== 'all' || !!urlQuery || !!from || !!to;
  const clearFilters = () => {
    setSearch('');
    patch({ status: undefined, q: undefined, from: undefined, to: undefined });
  };

  const rows = data?.rows ?? [];
  const totalPages = pageCount(data?.total ?? 0, WORK_ORDERS_PAGE_SIZE);

  return (
    <PageShell
      title={t('workOrders.title')}
      description={t('workOrders.subtitle')}
      icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
    >
      {!isMaintConfigured ? (
        <MaintNotConfigured />
      ) : (
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="flex flex-col gap-3 p-3">
              <ChipRadioGroup<StatusFilter>
                label={t('workOrders.fields.status')}
                value={status}
                onChange={(value) => patch({ status: value === 'all' ? undefined : value })}
                edgeBleed={false}
                options={[
                  { value: 'all', label: t('workOrders.filters.all') },
                  { value: 'open', label: t('workOrders.status.open') },
                  { value: 'closed', label: t('workOrders.status.closed') },
                ]}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput
                  id="work-orders-search"
                  value={search}
                  onChange={setSearch}
                  placeholder={t('workOrders.filters.searchPlate')}
                />
                <DateRangePicker
                  // A bare day would be read as UTC midnight; pin it to the local day.
                  from={from ? `${from}T00:00:00` : null}
                  to={to ? `${to}T00:00:00` : null}
                  onChange={(nextFrom, nextTo) =>
                    patch({
                      from: nextFrom ? toDateOnly(nextFrom) || undefined : undefined,
                      to: nextTo ? toDateOnly(nextTo) || undefined : undefined,
                    })
                  }
                />
                {filtered && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t('common.clearFilters')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isError ? (
            <MaintError onRetry={() => void refetch()} retrying={isFetching} />
          ) : !isLoading && rows.length === 0 ? (
            <EmptyState
              icon={
                filtered ? (
                  <Search className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                )
              }
              title={filtered ? t('workOrders.empty.filteredTitle') : t('workOrders.empty.title')}
              description={
                filtered
                  ? t('workOrders.empty.filteredDescription')
                  : t('workOrders.empty.description')
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
                <WorkOrdersTable
                  data={rows}
                  loading={isLoading}
                  pagination={{
                    page,
                    totalPages,
                    onPageChange: (next) =>
                      patch({ page: next > 1 ? String(next) : undefined }, true),
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
