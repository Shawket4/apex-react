import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Loader2,
  MapPin,
  MapPinOff,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { NativeSelect } from '@/shared/ui/native-select';
import { cn } from '@/shared/lib/cn';
import { normalize } from '@/shared/lib/normalize';
import { locationApi } from '@/entities/location/api';
import {
  useAckSuggestion,
  useLocationsInbox,
  usePinSuggestions,
  useTerminals,
  useUpdateDropoff,
  useUpdateTerminal,
} from '@/entities/location/queries';
import type { DropOffPoint, PinSuggestion, Terminal } from '@/entities/location/schemas';
import { LocationsDropoffDialog } from '../locations-dropoff-dialog';
import { LocationsTerminalDialog } from '../locations-terminal-dialog';
import { LocationsMapPicker } from '../locations-map-picker';
import { TripsPagination } from '../trips-table/trips-pagination';

const STORED_PIN_COLOR = '#2563eb';
const SUGGESTED_PIN_COLOR = '#16a34a';

/** Case/diacritic-insensitive name matching (Arabic-aware). */
function sameName(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/* -------------------------------------------------------------------------- */
/* Queue model                                                                 */
/*                                                                             */
/* Every inbox source flattens into ONE work item type so the whole page is a  */
/* single prioritized, filterable list — not four stacked sections. Priority   */
/* mirrors impact: a wrong pin corrupts audits (worst), a one-click fix is     */
/* cheap value, provisional confirmations are housekeeping, and manual pinning */
/* comes last because it needs the most human effort.                          */
/* -------------------------------------------------------------------------- */

type QueueItem =
  | { type: 'mismatch'; key: string; name: string; kind: 'terminal' | 'dropoff'; s: PinSuggestion }
  | {
      type: 'unpinned';
      key: string;
      name: string;
      kind: 'terminal' | 'dropoff';
      dropoff: DropOffPoint | null;
      s: PinSuggestion | null;
    }
  | { type: 'provisional'; key: string; name: string; kind: 'terminal' | 'dropoff'; s: PinSuggestion };

type IssueFilter = 'all' | 'mismatch' | 'unpinned' | 'provisional';
type KindFilter = 'all' | 'terminal' | 'dropoff';

const PRIORITY: Record<QueueItem['type'], number> = { mismatch: 0, unpinned: 1, provisional: 2 };

function itemEvidence(item: QueueItem): number {
  if (item.type === 'unpinned') return item.s?.stop_count ?? 0;
  return item.s.stop_count;
}

/**
 * "Needs Attention" — the Locations work queue.
 *
 * One flat, prioritized list. Each row: what the place is, one sentence on
 * why it is here, and ONE primary action. Expanding a row (single-open
 * accordion) reveals the map evidence — maps render only for the open row,
 * which keeps a 60-item queue fast.
 */
export function LocationsNeedsAttention({ onBrowseDropoffs }: { onBrowseDropoffs?: () => void }) {
  const { t } = useTranslation();

  const inboxQuery = useLocationsInbox();
  const suggestionsQuery = usePinSuggestions();
  const autoAppliedQuery = usePinSuggestions('auto_applied');
  const { data: terminals = [] } = useTerminals();

  const updateDropoff = useUpdateDropoff();
  const updateTerminal = useUpdateTerminal();
  const ackSuggestion = useAckSuggestion();

  const inbox = inboxQuery.data;
  const suggestionsUnavailable = suggestionsQuery.isError;

  const pending = React.useMemo(
    () => (suggestionsQuery.data ?? []).filter((s) => s.status === 'pending'),
    [suggestionsQuery.data],
  );
  const provisional = React.useMemo(
    () => (autoAppliedQuery.data ?? []).filter((s) => s.status === 'auto_applied'),
    [autoAppliedQuery.data],
  );

  const findTerminalByName = React.useCallback(
    (name: string): Terminal | null => terminals.find((x) => sameName(x.name, name)) ?? null,
    [terminals],
  );

  /* ---- Build the unified queue ---- */
  const items = React.useMemo<QueueItem[]>(() => {
    const out: QueueItem[] = [];

    for (const s of pending) {
      const hasStored = s.current_lat != null && s.current_lng != null && (s.offset_m ?? 0) > 0;
      if (hasStored) {
        out.push({ type: 'mismatch', key: `m-${s.id}`, name: s.name, kind: s.kind, s });
      } else if (s.kind === 'terminal') {
        out.push({ type: 'unpinned', key: `t-${s.id}`, name: s.name, kind: 'terminal', dropoff: null, s });
      }
    }

    const newDropoffPins = pending.filter((s) => s.kind === 'dropoff' && s.current_lat == null);
    for (const d of inbox?.unpinned_dropoffs ?? []) {
      const s = newDropoffPins.find((x) => sameName(x.name, d.name)) ?? null;
      out.push({ type: 'unpinned', key: `d-${d.ID}`, name: d.name, kind: 'dropoff', dropoff: d, s });
    }

    for (const s of provisional) {
      out.push({ type: 'provisional', key: `p-${s.id}`, name: s.name, kind: s.kind, s });
    }

    // Impact order, then strongest GPS evidence first, then name.
    out.sort((a, b) => {
      if (PRIORITY[a.type] !== PRIORITY[b.type]) return PRIORITY[a.type] - PRIORITY[b.type];
      const ev = itemEvidence(b) - itemEvidence(a);
      if (ev !== 0) return ev;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [pending, provisional, inbox]);

  /* ---- Filters ---- */
  const [issue, setIssue] = React.useState<IssueFilter>('all');
  const [kind, setKind] = React.useState<KindFilter>('all');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(25);

  const counts = React.useMemo(
    () => ({
      all: items.length,
      mismatch: items.filter((i) => i.type === 'mismatch').length,
      unpinned: items.filter((i) => i.type === 'unpinned').length,
      provisional: items.filter((i) => i.type === 'provisional').length,
    }),
    [items],
  );

  const filtered = React.useMemo(
    () =>
      items.filter(
        (i) => (issue === 'all' || i.type === issue) && (kind === 'all' || i.kind === kind),
      ),
    [items, issue, kind],
  );

  React.useEffect(() => {
    setPage(1);
    setExpandedKey(null);
  }, [issue, kind, limit]);

  /* ---- Single-open accordion ---- */
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);

  /* ---- Actions (same semantics as before the redesign) ---- */
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = React.useState<{
    dropoff: DropOffPoint;
    suggestion: PinSuggestion | null;
    pinSource: string;
  } | null>(null);
  const [terminalTarget, setTerminalTarget] = React.useState<{
    terminal: Terminal;
    suggestion: PinSuggestion;
  } | null>(null);

  const notFoundToast = () =>
    toast.error(
      t(
        'locations.inbox.noMatch',
        'No matching record found for this name — the pin cannot be moved automatically.',
      ),
    );

  const findDropoffByName = React.useCallback(async (name: string): Promise<DropOffPoint | null> => {
    try {
      const page = await locationApi.listDropoffs({ q: name, per_page: 10 });
      return page.items.find((d) => sameName(d.name, name)) ?? null;
    } catch {
      return null;
    }
  }, []);

  const applySuggestedPin = async (item: QueueItem, s: PinSuggestion, pinSource: string) => {
    setBusyKey(item.key);
    try {
      if (s.kind === 'dropoff') {
        const dropoff =
          (item.type === 'unpinned' ? item.dropoff : null) ?? (await findDropoffByName(s.name));
        if (!dropoff) {
          notFoundToast();
          return;
        }
        await updateDropoff.mutateAsync({
          id: dropoff.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng, pin_source: pinSource },
        });
      } else {
        const terminal = findTerminalByName(s.name);
        if (!terminal) {
          notFoundToast();
          return;
        }
        await updateTerminal.mutateAsync({
          id: terminal.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng, pin_source: pinSource },
        });
      }
      await ackSuggestion.mutateAsync({ id: s.id, status: 'accepted' });
    } catch {
      // Toasts handled by the mutations
    } finally {
      setBusyKey(null);
    }
  };

  const dismissSuggestion = async (item: QueueItem, s: PinSuggestion) => {
    setBusyKey(item.key);
    try {
      await ackSuggestion.mutateAsync({ id: s.id, status: 'dismissed' });
    } catch {
      // Toast handled by the mutation
    } finally {
      setBusyKey(null);
    }
  };

  const adjustPin = async (item: QueueItem, s: PinSuggestion) => {
    setBusyKey(item.key);
    try {
      if (s.kind === 'dropoff') {
        const dropoff =
          (item.type === 'unpinned' ? item.dropoff : null) ?? (await findDropoffByName(s.name));
        if (!dropoff) {
          notFoundToast();
          return;
        }
        setReviewTarget({ dropoff, suggestion: s, pinSource: 'manual' });
      } else {
        const terminal = findTerminalByName(s.name);
        if (!terminal) {
          notFoundToast();
          return;
        }
        setTerminalTarget({ terminal, suggestion: s });
      }
    } finally {
      setBusyKey(null);
    }
  };

  /* ---- Loading / empty ---- */
  if (inboxQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const totalUnpinned = inbox?.total_unpinned ?? inbox?.unpinned_dropoffs.length ?? 0;
  const cappedNote = totalUnpinned > (inbox?.unpinned_dropoffs.length ?? 0);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-6 w-6" />}
        title={t('locations.inbox.allClear', 'All caught up')}
        description={t('locations.inbox.allClearDesc', 'No locations need attention right now.')}
        action={
          onBrowseDropoffs ? (
            <Button variant="outline" size="sm" onClick={onBrowseDropoffs}>
              {t('locations.inbox.browseDropoffs', 'Browse drop-off points')}
            </Button>
          ) : undefined
        }
      />
    );
  }

  const issuePills: Array<{ id: IssueFilter; label: string; count: number }> = [
    { id: 'all', label: t('locations.inbox.filter.all', 'All'), count: counts.all },
    { id: 'mismatch', label: t('locations.inbox.filter.mismatch', 'Wrong pin'), count: counts.mismatch },
    { id: 'unpinned', label: t('locations.inbox.filter.unpinned', 'Missing pin'), count: counts.unpinned },
    {
      id: 'provisional',
      label: t('locations.inbox.filter.provisional', 'Provisional'),
      count: counts.provisional,
    },
  ];

  return (
    <div className="space-y-4">
      {suggestionsUnavailable && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {t(
            'locations.inbox.suggestionsUnavailable',
            'GPS suggestions are unavailable right now — showing database items only.',
          )}
        </div>
      )}

      {/* Toolbar: issue pills + kind select */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {issuePills
            .filter((p) => p.id === 'all' || p.count > 0)
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIssue(p.id)}
                aria-pressed={issue === p.id}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                  issue === p.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted/60',
                )}
              >
                {p.label}
                <span className="tabular-nums opacity-80">{p.count}</span>
              </button>
            ))}
        </div>
        <NativeSelect
          value={kind}
          onChange={(e) => setKind(e.target.value as KindFilter)}
          className="ms-auto h-8 w-auto text-xs"
          aria-label={t('locations.inbox.filter.kind', 'Location type')}
        >
          <option value="all">{t('locations.inbox.filter.allKinds', 'All types')}</option>
          <option value="terminal">{t('locations.kind.terminal', 'Terminal')}</option>
          <option value="dropoff">{t('locations.kind.dropoff', 'Drop-off')}</option>
        </NativeSelect>
      </div>

      {cappedNote && (
        <p className="text-xs text-muted-foreground">
          {t('locations.inbox.unpinnedCapped', {
            shown: inbox?.unpinned_dropoffs.length ?? 0,
            total: totalUnpinned,
            defaultValue: 'Showing the first {{shown}} of {{total}} unpinned drop-off points.',
          })}
        </p>
      )}

      {/* The queue */}
      <div className="divide-y overflow-hidden rounded-lg border bg-card">
        {filtered.slice((page - 1) * limit, page * limit).map((item) => (
          <QueueRow
            key={item.key}
            item={item}
            expanded={expandedKey === item.key}
            busy={busyKey === item.key}
            terminalMissing={item.kind === 'terminal' && !findTerminalByName(item.name)}
            onToggle={() => setExpandedKey((k) => (k === item.key ? null : item.key))}
            onApply={(s, source) => void applySuggestedPin(item, s, source)}
            onDismiss={(s) => void dismissSuggestion(item, s)}
            onAdjust={(s) => void adjustPin(item, s)}
            onSetPinManually={() => {
              if (item.type === 'unpinned' && item.dropoff) {
                setReviewTarget({ dropoff: item.dropoff, suggestion: null, pinSource: 'manual' });
              }
            }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {t('locations.inbox.noneForFilter', 'Nothing matches this filter.')}
          </p>
        )}
      </div>

      <TripsPagination
        page={page}
        pages={Math.max(1, Math.ceil(filtered.length / limit))}
        total={filtered.length}
        limit={limit}
        onPageChange={(p) => {
          setPage(p);
          setExpandedKey(null);
        }}
        onLimitChange={setLimit}
      />

      {/* Drop-off pin editor */}
      <LocationsDropoffDialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        dropoff={reviewTarget?.dropoff ?? null}
        initialPin={
          reviewTarget?.suggestion
            ? { lat: reviewTarget.suggestion.suggested_lat, lng: reviewTarget.suggestion.suggested_lng }
            : null
        }
        pinSourceOnSave={reviewTarget?.pinSource ?? 'manual'}
        note={
          reviewTarget?.suggestion
            ? t('locations.inbox.gpsSuggests', {
                stops: reviewTarget.suggestion.stop_count,
                defaultValue: 'GPS suggests a pin from {{stops}} stops',
              })
            : undefined
        }
        onSaved={async () => {
          if (reviewTarget?.suggestion) {
            await ackSuggestion.mutateAsync({ id: reviewTarget.suggestion.id, status: 'accepted' });
          }
        }}
      />

      {/* Terminal pin editor */}
      <LocationsTerminalDialog
        terminal={terminalTarget?.terminal ?? null}
        onOpenChange={(open) => {
          if (!open) setTerminalTarget(null);
        }}
        onSaved={async () => {
          if (terminalTarget) {
            await ackSuggestion.mutateAsync({ id: terminalTarget.suggestion.id, status: 'accepted' });
          }
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* One queue row                                                               */
/* -------------------------------------------------------------------------- */

function QueueRow({
  item,
  expanded,
  busy,
  terminalMissing,
  onToggle,
  onApply,
  onDismiss,
  onAdjust,
  onSetPinManually,
}: {
  item: QueueItem;
  expanded: boolean;
  busy: boolean;
  terminalMissing: boolean;
  onToggle: () => void;
  onApply: (s: PinSuggestion, pinSource: string) => void;
  onDismiss: (s: PinSuggestion) => void;
  onAdjust: (s: PinSuggestion) => void;
  onSetPinManually: () => void;
}) {
  const { t } = useTranslation();

  const s = item.type === 'unpinned' ? item.s : item.s;
  const hasEvidence = s != null;

  const icon =
    item.type === 'mismatch' ? (
      <ArrowRightLeft className="h-4 w-4 text-warning" />
    ) : item.type === 'provisional' ? (
      <Sparkles className="h-4 w-4 text-success" />
    ) : (
      <MapPinOff className="h-4 w-4 text-muted-foreground" />
    );

  const why =
    item.type === 'mismatch'
      ? t('locations.inbox.mismatchText', {
          distance: Math.round(item.s.offset_m ?? 0),
          stops: item.s.stop_count,
          defaultValue: 'GPS cluster is {{distance}} m from the stored pin ({{stops}} stops)',
        })
      : item.type === 'provisional'
        ? t('locations.inbox.provisionalText', {
            stops: item.s.stop_count,
            defaultValue: 'Pin applied automatically from {{stops}} GPS stops',
          })
        : s
          ? t('locations.inbox.gpsSuggests', {
              stops: s.stop_count,
              defaultValue: 'GPS suggests a pin from {{stops}} stops',
            })
          : t('locations.inbox.noPinNoData', 'No pin yet — set it on the map');

  /* The ONE primary action per row type. */
  const primary = (() => {
    if (item.type === 'mismatch') {
      return (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={busy || (item.kind === 'terminal' && terminalMissing)}
          onClick={(e) => {
            e.stopPropagation();
            onApply(item.s, 'gps_suggested');
          }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
          {t('locations.inbox.movePin', 'Move pin')}
        </Button>
      );
    }
    if (item.type === 'provisional') {
      return (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onApply(item.s, 'manual');
          }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {t('locations.inbox.confirmPin', 'Confirm')}
        </Button>
      );
    }
    if (s) {
      return (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={busy || (item.kind === 'terminal' && terminalMissing)}
          onClick={(e) => {
            e.stopPropagation();
            onApply(s, 'gps_suggested');
          }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {t('locations.inbox.applyPin', 'Apply pin')}
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={item.kind === 'terminal'}
        onClick={(e) => {
          e.stopPropagation();
          onSetPinManually();
        }}
      >
        {t('locations.inbox.setPin', 'Set pin')}
      </Button>
    );
  })();

  return (
    <div className={cn('transition-colors', expanded && 'bg-muted/30')}>
      {/* Row line */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
      >
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate text-sm font-medium" dir="auto">
              {item.name}
            </span>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {item.kind === 'terminal'
                ? t('locations.kind.terminal', 'Terminal')
                : t('locations.kind.dropoff', 'Drop-off')}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground" dir="auto">
            {why}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {primary}
          {hasEvidence && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
          )}
        </div>
      </div>

      {/* Expanded evidence — the ONLY row that renders a map */}
      {expanded && s && (
        <div className="space-y-3 border-t px-3 py-3">
          <LocationsMapPicker
            lat={item.type === 'mismatch' ? (item.s.current_lat ?? null) : item.type === 'provisional' ? s.suggested_lat : null}
            lng={item.type === 'mismatch' ? (item.s.current_lng ?? null) : item.type === 'provisional' ? s.suggested_lng : null}
            primaryColor={item.type === 'provisional' ? SUGGESTED_PIN_COLOR : STORED_PIN_COLOR}
            primaryTitle={
              item.type === 'provisional'
                ? item.name
                : t('locations.inbox.currentPin', 'Stored pin')
            }
            secondary={
              item.type !== 'provisional'
                ? {
                    lat: s.suggested_lat,
                    lng: s.suggested_lng,
                    color: SUGGESTED_PIN_COLOR,
                    title: t('locations.inbox.suggestedPin', 'GPS suggestion'),
                  }
                : undefined
            }
            className="h-[240px]"
          />
          {item.type === 'mismatch' && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STORED_PIN_COLOR }} />
                {t('locations.inbox.currentPin', 'Stored pin')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SUGGESTED_PIN_COLOR }} />
                {t('locations.inbox.suggestedPin', 'GPS suggestion')}
              </span>
            </div>
          )}
          {item.kind === 'terminal' && terminalMissing && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <HelpCircle className="h-3.5 w-3.5" />
              {t(
                'locations.inbox.noMatch',
                'No matching record found for this name — the pin cannot be moved automatically.',
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(item.type === 'provisional' || item.type === 'unpinned') && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={() => onAdjust(s)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('locations.inbox.adjustPin', 'Adjust')}
              </Button>
            )}
            {item.type === 'mismatch' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onDismiss(item.s)}>
                {t('locations.inbox.keepCurrent', 'Keep current')}
              </Button>
            )}
            {item.type !== 'mismatch' && s.status === 'pending' && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDismiss(s)}>
                {t('locations.inbox.dismiss', 'Dismiss')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
