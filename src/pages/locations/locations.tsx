import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { SearchInput } from '@/shared/ui/search-input';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
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

type LocationsTab = 'inbox' | 'terminals' | 'dropoffs';

const DROPOFFS_PAGE_SIZE = 50;

/**
 * Locations admin page — the single place where canonical terminals and
 * drop-off points are managed (pins, radius overrides, company allowlists,
 * receipt serialization patterns). Drop-off points are created implicitly
 * by fee mappings; here they only get pinned, adjusted, or deleted.
 */
export default function LocationsPage() {
  const { t } = useTranslation();

  /* ---- Tab state; defaults to the inbox when it has items ---- */
  const [tab, setTab] = React.useState<LocationsTab>('inbox');
  const tabDecided = React.useRef(false);

  const inboxQuery = useLocationsInbox();
  const suggestionsQuery = usePinSuggestions();
  const autoAppliedQuery = usePinSuggestions('auto_applied');

  const mismatchCount = React.useMemo(
    () =>
      (suggestionsQuery.data ?? []).filter(
        (s) =>
          s.status === 'pending' &&
          ((s.current_lat != null && s.current_lng != null && (s.offset_m ?? 0) > 0) ||
            // Terminal set-pin suggestions (no stored pin yet) also surface
            // as actionable cards.
            (s.kind === 'terminal' && s.current_lat == null)),
      ).length,
    [suggestionsQuery.data],
  );

  const provisionalCount = React.useMemo(
    () => (autoAppliedQuery.data ?? []).filter((s) => s.status === 'auto_applied').length,
    [autoAppliedQuery.data],
  );

  const attentionCount =
    (inboxQuery.data?.unpinned_dropoffs.length ?? 0) + mismatchCount + provisionalCount;

  // Pick the initial tab once both sources have settled (the suggestions
  // fetch erroring counts as settled — the inbox degrades gracefully).
  React.useEffect(() => {
    if (tabDecided.current) return;
    const inboxSettled = inboxQuery.isSuccess || inboxQuery.isError;
    const suggestionsSettled = suggestionsQuery.isSuccess || suggestionsQuery.isError;
    if (!inboxSettled || !suggestionsSettled) return;
    tabDecided.current = true;
    if (attentionCount === 0) {
      setTab('dropoffs');
    }
  }, [
    inboxQuery.isSuccess,
    inboxQuery.isError,
    suggestionsQuery.isSuccess,
    suggestionsQuery.isError,
    attentionCount,
  ]);

  const handleTabChange = (value: string) => {
    tabDecided.current = true; // user choice always wins
    setTab(value as LocationsTab);
  };

  /* ---- Terminals tab ---- */
  const terminalsQuery = useTerminals();
  const [selectedTerminalId, setSelectedTerminalId] = React.useState<number | null>(null);
  // Derive from the query cache so pattern edits refresh the open dialog
  const selectedTerminal =
    selectedTerminalId != null
      ? (terminalsQuery.data ?? []).find((term) => term.ID === selectedTerminalId) ?? null
      : null;

  /* ---- Drop-offs tab (server-side paginated) ---- */
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [missingOnly, setMissingOnly] = React.useState(false);
  const [dropoffsPage, setDropoffsPage] = React.useState(1);

  // Filter changes restart from page 1.
  React.useEffect(() => {
    setDropoffsPage(1);
  }, [debouncedSearch, missingOnly]);

  const dropoffsQuery = useDropoffs({
    q: debouncedSearch.trim() || undefined,
    missing: missingOnly || undefined,
    page: dropoffsPage,
    per_page: DROPOFFS_PAGE_SIZE,
  });
  const dropoffs = dropoffsQuery.data?.items ?? [];
  const dropoffsTotal = dropoffsQuery.data?.total ?? 0;
  const dropoffsTotalPages = Math.max(1, Math.ceil(dropoffsTotal / DROPOFFS_PAGE_SIZE));

  const [editingDropoffId, setEditingDropoffId] = React.useState<number | null>(null);
  const editingDropoff =
    editingDropoffId != null
      ? dropoffs.find((d) => d.ID === editingDropoffId) ?? null
      : null;
  const [pendingDelete, setPendingDelete] = React.useState<DropOffPoint | null>(null);
  const deleteDropoff = useDeleteDropoff();

  const handleDeleteRequest = (dropoff: DropOffPoint) => {
    setEditingDropoffId(null);
    setPendingDelete(dropoff);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDropoff.mutateAsync(pendingDelete.ID);
      setPendingDelete(null);
    } catch {
      // Toast (including the 409 "still referenced" case) handled by the mutation
      setPendingDelete(null);
    }
  };

  return (
    <PageShell
      title={t('locations.title', 'Locations')}
      description={t(
        'locations.description',
        'Manage canonical terminals and drop-off points — pins, radii, company allowlists, and receipt serialization — in one place.',
      )}
    >
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            {t('locations.tabs.inbox', 'Needs Attention')}
            {attentionCount > 0 && (
              <Badge variant="warning" className="px-1.5">
                {attentionCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="terminals">
            {t('locations.tabs.terminals', 'Terminals')}
          </TabsTrigger>
          <TabsTrigger value="dropoffs">
            {t('locations.tabs.dropoffs', 'Drop-off Points')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <LocationsNeedsAttention />
        </TabsContent>

        <TabsContent value="terminals" className="mt-4">
          <LocationsTerminalsTable
            terminals={terminalsQuery.data ?? []}
            loading={terminalsQuery.isLoading}
            onRowClick={(terminal) => setSelectedTerminalId(terminal.ID)}
          />
        </TabsContent>

        <TabsContent value="dropoffs" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('locations.dropoffs.searchPlaceholder', 'Search drop-off points…')}
              className="sm:max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Switch
                id="missing-only"
                checked={missingOnly}
                onCheckedChange={setMissingOnly}
              />
              <Label htmlFor="missing-only" className="cursor-pointer text-sm">
                {t('locations.dropoffs.missingOnly', 'Missing pins only')}
              </Label>
            </div>
            {dropoffsTotal > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums sm:ms-auto">
                {t('locations.dropoffs.totalCount', {
                  count: dropoffsTotal,
                  defaultValue: '{{count}} drop-off points',
                })}
              </span>
            )}
          </div>
          <LocationsDropoffsTable
            dropoffs={dropoffs}
            loading={dropoffsQuery.isLoading}
            onRowClick={(dropoff) => setEditingDropoffId(dropoff.ID)}
            pagination={{
              page: dropoffsPage,
              totalPages: dropoffsTotalPages,
              onPageChange: setDropoffsPage,
            }}
            pageSize={DROPOFFS_PAGE_SIZE}
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
        onDelete={handleDeleteRequest}
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
