import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, Plus } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
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

/**
 * Locations admin page — the single place where canonical terminals and
 * drop-off points are managed (pins, radius overrides, aliases), so fee
 * mappings never need per-row lat/lng entry again.
 */
export default function LocationsPage() {
  const { t } = useTranslation();

  /* ---- Tab state; defaults to the inbox when it has items ---- */
  const [tab, setTab] = React.useState<LocationsTab>('inbox');
  const tabDecided = React.useRef(false);

  const inboxQuery = useLocationsInbox();
  const suggestionsQuery = usePinSuggestions();

  const mismatchCount = React.useMemo(
    () =>
      (suggestionsQuery.data ?? []).filter(
        (s) =>
          s.status === 'pending' &&
          s.current_lat != null &&
          s.current_lng != null &&
          (s.offset_m ?? 0) > 0,
      ).length,
    [suggestionsQuery.data],
  );

  const attentionCount =
    (inboxQuery.data?.unpinned_dropoffs.length ?? 0) +
    (inboxQuery.data?.unknown_terminals.length ?? 0) +
    mismatchCount;

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
  // Derive from the query cache so alias add/remove refreshes the open dialog
  const selectedTerminal =
    selectedTerminalId != null
      ? (terminalsQuery.data ?? []).find((term) => term.ID === selectedTerminalId) ?? null
      : null;

  /* ---- Drop-offs tab ---- */
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [missingOnly, setMissingOnly] = React.useState(false);
  const dropoffsQuery = useDropoffs({
    q: debouncedSearch.trim() || undefined,
    missing: missingOnly || undefined,
  });

  const [editingDropoffId, setEditingDropoffId] = React.useState<number | null>(null);
  const editingDropoff =
    editingDropoffId != null
      ? (dropoffsQuery.data ?? []).find((d) => d.ID === editingDropoffId) ?? null
      : null;
  const [createOpen, setCreateOpen] = React.useState(false);
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
      // Toast handled by the mutation
    }
  };

  return (
    <PageShell
      title={t('locations.title', 'Locations')}
      description={t(
        'locations.description',
        'Manage canonical terminals and drop-off points — pins, radii, and aliases — in one place.',
      )}
      actions={
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('locations.newDropoff', 'New drop-off point')}
        </Button>
      }
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
          </div>
          <LocationsDropoffsTable
            dropoffs={dropoffsQuery.data ?? []}
            loading={dropoffsQuery.isLoading}
            onRowClick={(dropoff) => setEditingDropoffId(dropoff.ID)}
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

      {/* Drop-off creator */}
      <LocationsDropoffDialog open={createOpen} onOpenChange={setCreateOpen} />

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
