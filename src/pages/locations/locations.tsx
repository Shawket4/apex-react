import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Inbox, MapPin, Warehouse } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import { SearchInput } from '@/shared/ui/search-input';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/lib/cn';
import { isValidCoordinate } from '@/shared/lib/coords';
import { useDebounce } from '@/shared/hooks/use-debounce';
import {
  useDeleteDropoff,
  useDropoffs,
  useLocationsInbox,
  usePinSuggestions,
  useTerminals,
} from '@/entities/location/queries';
import type { DropOffPoint } from '@/entities/location/schemas';
import { LocationsNeedsAttention } from '@/widgets/locations-needs-attention';
import { LocationsTerminalsTable } from '@/widgets/locations-terminals-table';
import { LocationsDropoffsTable } from '@/widgets/locations-dropoffs-table';
import { LocationsTerminalDialog } from '@/widgets/locations-terminal-dialog';
import { LocationsDropoffDialog } from '@/widgets/locations-dropoff-dialog';
import { TripsPagination } from '@/widgets/trips-table/trips-pagination';

type LocationsTab = 'inbox' | 'terminals' | 'dropoffs';
type PinFilter = 'all' | 'missing';

const LIMIT_STORAGE_KEY = 'apex:locations:limit';

function storedLimit(): number {
  try {
    const v = parseInt(localStorage.getItem(LIMIT_STORAGE_KEY) ?? '', 10);
    return [10, 25, 50, 100].includes(v) ? v : 25;
  } catch {
    return 25;
  }
}

/**
 * Locations — the single place where canonical terminals and drop-off points
 * are managed. The page's job is one thing: every place ends up with an
 * accurate pin. The header shows coverage and points at the work; the
 * "Needs attention" queue is where the work happens; the two catalog views
 * are for browsing and editing.
 */
export default function LocationsPage() {
  const { t } = useTranslation();

  const [tab, setTab] = React.useState<LocationsTab>('inbox');
  const tabDecided = React.useRef(false);

  /* ---- Shared data for the header + inbox badge ---- */
  const inboxQuery = useLocationsInbox();
  const suggestionsQuery = usePinSuggestions();
  const autoAppliedQuery = usePinSuggestions('auto_applied');
  const terminalsQuery = useTerminals();
  // One-row probe: the envelope's `total` is the full drop-off count.
  const dropoffTotalsQuery = useDropoffs({ page: 1, per_page: 1 });

  const pendingCount = React.useMemo(
    () =>
      (suggestionsQuery.data ?? []).filter(
        (s) =>
          s.status === 'pending' &&
          ((s.current_lat != null && s.current_lng != null && (s.offset_m ?? 0) > 0) ||
            (s.kind === 'terminal' && s.current_lat == null)),
      ).length,
    [suggestionsQuery.data],
  );
  const provisionalCount = React.useMemo(
    () => (autoAppliedQuery.data ?? []).filter((s) => s.status === 'auto_applied').length,
    [autoAppliedQuery.data],
  );
  const unpinnedDropoffs = inboxQuery.data?.total_unpinned ?? 0;
  const attentionCount = unpinnedDropoffs + pendingCount + provisionalCount;

  // `?? []` mints a new array every render, which is a dependency that always
  // differs. Memoised so the hooks below re-run when the data changes, not when
  // the component does.
  const terminals = React.useMemo(() => terminalsQuery.data ?? [], [terminalsQuery.data]);
  const terminalsPinned = terminals.filter((x) => isValidCoordinate(x.lat, x.long)).length;
  const dropoffsTotalAll = dropoffTotalsQuery.data?.total ?? 0;
  const dropoffsPinned = Math.max(0, dropoffsTotalAll - unpinnedDropoffs);
  const totalPlaces = terminals.length + dropoffsTotalAll;
  const totalPinned = terminalsPinned + dropoffsPinned;
  const coveragePct = totalPlaces > 0 ? Math.round((totalPinned / totalPlaces) * 100) : 0;

  // Land on the catalog when there is nothing to fix (user choice always wins).
  React.useEffect(() => {
    if (tabDecided.current) return;
    const settled =
      (inboxQuery.isSuccess || inboxQuery.isError) &&
      (suggestionsQuery.isSuccess || suggestionsQuery.isError);
    if (!settled) return;
    tabDecided.current = true;
    if (attentionCount === 0) setTab('dropoffs');
  }, [
    inboxQuery.isSuccess,
    inboxQuery.isError,
    suggestionsQuery.isSuccess,
    suggestionsQuery.isError,
    attentionCount,
  ]);

  const handleTabChange = (value: string) => {
    tabDecided.current = true;
    setTab(value as LocationsTab);
  };

  /* ---- Terminals view ---- */
  const [terminalSearch, setTerminalSearch] = React.useState('');
  const [terminalPinFilter, setTerminalPinFilter] = React.useState<PinFilter>('all');
  const [selectedTerminalId, setSelectedTerminalId] = React.useState<number | null>(null);
  const selectedTerminal =
    selectedTerminalId != null ? terminals.find((x) => x.ID === selectedTerminalId) ?? null : null;

  const visibleTerminals = React.useMemo(() => {
    const q = terminalSearch.trim().toLowerCase();
    return terminals.filter((x) => {
      if (terminalPinFilter === 'missing' && isValidCoordinate(x.lat, x.long)) return false;
      if (q && !x.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [terminals, terminalSearch, terminalPinFilter]);

  /* ---- Drop-offs view (server-side search + filter + pagination) ---- */
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [pinFilter, setPinFilter] = React.useState<PinFilter>('all');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(storedLimit);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pinFilter, limit]);

  const dropoffsQuery = useDropoffs({
    q: debouncedSearch.trim() || undefined,
    missing: pinFilter === 'missing' || undefined,
    page,
    per_page: limit,
  });
  const dropoffs = dropoffsQuery.data?.items ?? [];
  const dropoffsTotal = dropoffsQuery.data?.total ?? 0;
  const dropoffsPages = Math.max(1, Math.ceil(dropoffsTotal / limit));

  const handleLimitChange = (next: number) => {
    setLimit(next);
    try {
      localStorage.setItem(LIMIT_STORAGE_KEY, String(next));
    } catch {
      /* storage may be unavailable; the in-memory value still applies */
    }
  };

  const [editingDropoffId, setEditingDropoffId] = React.useState<number | null>(null);
  const editingDropoff =
    editingDropoffId != null ? dropoffs.find((d) => d.ID === editingDropoffId) ?? null : null;
  const [pendingDelete, setPendingDelete] = React.useState<DropOffPoint | null>(null);
  const deleteDropoff = useDeleteDropoff();

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDropoff.mutateAsync(pendingDelete.ID);
    } catch {
      // Toast (incl. the 409 "still referenced" case) handled by the mutation
    } finally {
      setPendingDelete(null);
    }
  };

  const pinPills = (
    value: PinFilter,
    onChange: (v: PinFilter) => void,
    missingCount?: number,
  ) => (
    <div className="flex gap-1.5">
      {(
        [
          { id: 'all', label: t('locations.filter.all', 'All') },
          { id: 'missing', label: t('locations.filter.missingPins', 'Missing pins') },
        ] as Array<{ id: PinFilter; label: string }>
      ).map((p) => (
        <Button
          key={p.id}
          type="button"
          size="sm"
          variant={value === p.id ? 'default' : 'outline'}
          onClick={() => onChange(p.id)}
          aria-pressed={value === p.id}
          className="h-7 text-xs"
        >
          {p.label}
          {p.id === 'missing' && (missingCount ?? 0) > 0 && (
            <span className="tabular-nums opacity-70">{missingCount}</span>
          )}
        </Button>
      ))}
    </div>
  );

  return (
    <PageShell
      title={t('locations.title', 'Locations')}
      description={t(
        'locations.description',
        'Manage canonical terminals and drop-off points — pins, radii, company allowlists, and receipt serialization — in one place.',
      )}
    >
      {/* ---- Coverage header: the page's one job, made visible ---- */}
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <div
          className={cn(
            'rounded-lg border p-3 sm:col-span-1',
            attentionCount > 0 ? 'border-warning/40 bg-warning/10' : 'border-success/40 bg-success/10',
          )}
        >
          {attentionCount > 0 ? (
            <>
              <div className="font-mono text-[22px] font-semibold leading-none tabular-nums text-warning">
                {attentionCount}
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted-foreground">
                {t('locations.header.needAttention', 'locations need attention')}
              </div>
              <Button size="sm" className="mt-3" onClick={() => handleTabChange('inbox')}>
                {t('locations.header.startPinning', 'Start pinning')}
              </Button>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center gap-1">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {t('locations.header.allPinned', 'Every location is pinned')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('locations.header.allPinnedSub', 'New names appear here automatically.')}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {t('locations.header.dropoffs', 'Drop-off points')}
          </div>
          <div className="mt-1.5 font-mono text-[22px] font-semibold leading-none tabular-nums" dir="ltr">
            {dropoffsPinned}/{dropoffsTotalAll}
          </div>
          <div className="mt-1.5 text-[11.5px] text-muted-foreground">
            {t('locations.header.pinned', 'pinned')}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Warehouse className="h-4 w-4" />
            {t('locations.header.terminals', 'Terminals')}
          </div>
          <div className="mt-1.5 font-mono text-[22px] font-semibold leading-none tabular-nums" dir="ltr">
            {terminalsPinned}/{terminals.length}
          </div>
          <div className="mt-1.5 text-[11.5px] text-muted-foreground">
            {t('locations.header.pinned', 'pinned')}
          </div>
        </div>

        <div className="sm:col-span-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('locations.header.coverage', 'Pin coverage')}</span>
            <span className="tabular-nums">{coveragePct}%</span>
          </div>
          <Progress value={coveragePct} className="mt-1 h-1.5" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            {t('locations.tabs.inbox', 'Needs Attention')}
            {attentionCount > 0 && (
              <Badge variant="warning">
                {attentionCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dropoffs">
            {t('locations.tabs.dropoffs', 'Drop-off Points')}
          </TabsTrigger>
          <TabsTrigger value="terminals">{t('locations.tabs.terminals', 'Terminals')}</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-3">
          <LocationsNeedsAttention onBrowseDropoffs={() => handleTabChange('dropoffs')} />
        </TabsContent>

        <TabsContent value="dropoffs" className="mt-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('locations.dropoffs.searchPlaceholder', 'Search drop-off points…')}
              className="sm:max-w-sm"
            />
            {pinPills(pinFilter, setPinFilter, unpinnedDropoffs)}
          </div>
          <LocationsDropoffsTable
            dropoffs={dropoffs}
            loading={dropoffsQuery.isLoading}
            onRowClick={(dropoff) => setEditingDropoffId(dropoff.ID)}
            pageSize={limit}
          />
          <TripsPagination
            page={page}
            pages={dropoffsPages}
            total={dropoffsTotal}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            loading={dropoffsQuery.isFetching}
          />
        </TabsContent>

        <TabsContent value="terminals" className="mt-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={terminalSearch}
              onChange={setTerminalSearch}
              placeholder={t('locations.terminals.searchPlaceholder', 'Search terminals…')}
              className="sm:max-w-sm"
            />
            {pinPills(
              terminalPinFilter,
              setTerminalPinFilter,
              terminals.length - terminalsPinned,
            )}
          </div>
          <LocationsTerminalsTable
            terminals={visibleTerminals}
            loading={terminalsQuery.isLoading}
            onRowClick={(terminal) => setSelectedTerminalId(terminal.ID)}
          />
        </TabsContent>
      </Tabs>

      {/* Terminal editor */}
      <LocationsTerminalDialog
        terminal={selectedTerminal}
        onOpenChange={(open) => {
          if (!open) setSelectedTerminalId(null);
        }}
      />

      {/* Drop-off editor */}
      <LocationsDropoffDialog
        open={editingDropoff !== null}
        onOpenChange={(open) => {
          if (!open) setEditingDropoffId(null);
        }}
        dropoff={editingDropoff}
        onDelete={(d) => {
          setEditingDropoffId(null);
          setPendingDelete(d);
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t('locations.dropoffs.deleteTitle', 'Delete drop-off point?')}
        description={pendingDelete?.name}
        loading={deleteDropoff.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageShell>
  );
}
