import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  HelpCircle,
  Link2,
  Loader2,
  MapPinOff,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { NativeSelect } from '@/shared/ui/native-select';
import { normalize } from '@/shared/lib/normalize';
import {
  useAckSuggestion,
  useAddTerminalAlias,
  useDropoffs,
  useLocationsInbox,
  usePinSuggestions,
  useTerminals,
  useUpdateDropoff,
  useUpdateTerminal,
} from '@/entities/location/queries';
import type {
  DropOffPoint,
  PinSuggestion,
  Terminal,
  UnknownTerminal,
} from '@/entities/location/schemas';
import { LocationsDropoffDialog } from '../locations-dropoff-dialog';
import { LocationsMapPicker } from '../locations-map-picker';

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

const STORED_PIN_COLOR = '#2563eb';
const SUGGESTED_PIN_COLOR = '#16a34a';

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-sm font-semibold">{title}</h2>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}

/** Case/diacritic-insensitive name matching (Arabic-aware). */
function sameName(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/* -------------------------------------------------------------------------- */
/* Widget                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * "Needs Attention" inbox.
 *
 * Three sections, all fed from the FalconGo inbox endpoint plus (when the
 * etit proxy is reachable) GPS-derived pin suggestions:
 *   A. Drop-off points with no pin — [Review] a GPS suggestion or [Set pin]
 *      manually.
 *   B. Pin mismatches — GPS cluster sits far from the stored pin; move the
 *      pin to the suggestion or keep the current one.
 *   C. Unknown terminal names in trip data — link them as an alias of an
 *      existing terminal.
 *
 * The suggestions fetch failing (service not deployed yet) only hides the
 * GPS hints; sections A and C keep rendering from the database inbox.
 */
export function LocationsNeedsAttention() {
  const { t } = useTranslation();

  const inboxQuery = useLocationsInbox();
  const suggestionsQuery = usePinSuggestions();
  const { data: terminals = [] } = useTerminals();
  const { data: allDropoffs = [] } = useDropoffs({});

  const updateDropoff = useUpdateDropoff();
  const updateTerminal = useUpdateTerminal();
  const ackSuggestion = useAckSuggestion();

  const inbox = inboxQuery.data;
  const suggestionsUnavailable = suggestionsQuery.isError;
  const pendingSuggestions = React.useMemo(
    () => (suggestionsQuery.data ?? []).filter((s) => s.status === 'pending'),
    [suggestionsQuery.data],
  );

  /** Section B: suggestions that disagree with an existing stored pin. */
  const mismatches = React.useMemo(
    () =>
      pendingSuggestions.filter(
        (s) => s.current_lat != null && s.current_lng != null && (s.offset_m ?? 0) > 0,
      ),
    [pendingSuggestions],
  );

  /** New-pin suggestions (no stored pin) — matched to unpinned drop-offs by name. */
  const newPinSuggestions = React.useMemo(
    () => pendingSuggestions.filter((s) => s.kind === 'dropoff' && s.current_lat == null),
    [pendingSuggestions],
  );

  const findSuggestionFor = React.useCallback(
    (dropoff: DropOffPoint): PinSuggestion | null =>
      newPinSuggestions.find((s) => sameName(s.name, dropoff.name)) ?? null,
    [newPinSuggestions],
  );

  const findDropoffByName = React.useCallback(
    (name: string): DropOffPoint | null =>
      allDropoffs.find((d) => sameName(d.name, name)) ?? null,
    [allDropoffs],
  );

  const findTerminalByName = React.useCallback(
    (name: string): Terminal | null =>
      terminals.find(
        (term) =>
          sameName(term.name, name) || term.aliases.some((a) => sameName(a.alias, name)),
      ) ?? null,
    [terminals],
  );

  /* ---- Section A review dialog state ---- */
  const [reviewTarget, setReviewTarget] = React.useState<{
    dropoff: DropOffPoint;
    suggestion: PinSuggestion | null;
  } | null>(null);

  /* ---- Section B per-row busy tracking ---- */
  const [busySuggestionId, setBusySuggestionId] = React.useState<number | null>(null);

  const handleMovePin = async (s: PinSuggestion) => {
    setBusySuggestionId(s.id);
    try {
      if (s.kind === 'dropoff') {
        const dropoff = findDropoffByName(s.name);
        if (!dropoff) return;
        await updateDropoff.mutateAsync({
          id: dropoff.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng, pin_source: 'gps_suggested' },
        });
      } else {
        const terminal = findTerminalByName(s.name);
        if (!terminal) return;
        await updateTerminal.mutateAsync({
          id: terminal.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng },
        });
      }
      await ackSuggestion.mutateAsync({ id: s.id, status: 'accepted' });
    } catch {
      // Toasts handled by the mutations
    } finally {
      setBusySuggestionId(null);
    }
  };

  const handleKeepCurrent = async (s: PinSuggestion) => {
    setBusySuggestionId(s.id);
    try {
      await ackSuggestion.mutateAsync({ id: s.id, status: 'dismissed' });
    } catch {
      // Toast handled by the mutation
    } finally {
      setBusySuggestionId(null);
    }
  };

  /* ---- Loading / empty ---- */

  if (inboxQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const unpinned = inbox?.unpinned_dropoffs ?? [];
  const unknownTerminals = inbox?.unknown_terminals ?? [];
  const isEmpty = unpinned.length === 0 && unknownTerminals.length === 0 && mismatches.length === 0;

  return (
    <div className="space-y-6">
      {suggestionsUnavailable && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {t(
            'locations.inbox.suggestionsUnavailable',
            'GPS suggestions are unavailable right now — showing database items only.',
          )}
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title={t('locations.inbox.allClear', 'All caught up')}
          description={t('locations.inbox.allClearDesc', 'No locations need attention right now.')}
        />
      ) : (
        <>
          {/* ---------------- Section A: unpinned drop-offs ---------------- */}
          {unpinned.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<MapPinOff className="h-4 w-4" />}
                title={t('locations.inbox.unpinnedTitle', 'Drop-off points without pins')}
                count={unpinned.length}
              />
              <div className="divide-y overflow-hidden rounded-lg border bg-card">
                {unpinned.map((dropoff) => {
                  const suggestion = findSuggestionFor(dropoff);
                  return (
                    <div
                      key={dropoff.ID}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="truncate font-medium" dir="auto">
                          {dropoff.name}
                        </div>
                        {suggestion && (
                          <div className="flex items-center gap-1.5 text-xs text-success">
                            <Sparkles className="h-3.5 w-3.5" />
                            {t('locations.inbox.gpsSuggests', {
                              stops: suggestion.stop_count,
                              defaultValue: 'GPS suggests a pin from {{stops}} stops',
                            })}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {suggestion ? (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setReviewTarget({ dropoff, suggestion })}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {t('locations.inbox.review', 'Review')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewTarget({ dropoff, suggestion: null })}
                          >
                            {t('locations.inbox.setPin', 'Set pin')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------- Section B: pin mismatches ---------------- */}
          {mismatches.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<ArrowRightLeft className="h-4 w-4" />}
                title={t('locations.inbox.mismatchTitle', 'Pin mismatches')}
                count={mismatches.length}
              />
              <div className="space-y-3">
                {mismatches.map((s) => {
                  const target =
                    s.kind === 'dropoff' ? findDropoffByName(s.name) : findTerminalByName(s.name);
                  const busy = busySuggestionId === s.id;
                  return (
                    <div key={s.id} className="space-y-3 rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium" dir="auto">
                          {s.name}
                        </span>
                        <Badge variant="outline">
                          {s.kind === 'terminal'
                            ? t('locations.kind.terminal', 'Terminal')
                            : t('locations.kind.dropoff', 'Drop-off')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('locations.inbox.mismatchText', {
                          distance: Math.round(s.offset_m ?? 0),
                          stops: s.stop_count,
                          defaultValue:
                            'GPS cluster is {{distance}} m from the stored pin ({{stops}} stops)',
                        })}
                      </p>
                      <LocationsMapPicker
                        lat={s.current_lat ?? null}
                        lng={s.current_lng ?? null}
                        primaryColor={STORED_PIN_COLOR}
                        primaryTitle={t('locations.inbox.currentPin', 'Stored pin')}
                        secondary={{
                          lat: s.suggested_lat,
                          lng: s.suggested_lng,
                          color: SUGGESTED_PIN_COLOR,
                          title: t('locations.inbox.suggestedPin', 'GPS suggestion'),
                        }}
                        className="h-[220px]"
                      />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: STORED_PIN_COLOR }}
                          />
                          {t('locations.inbox.currentPin', 'Stored pin')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: SUGGESTED_PIN_COLOR }}
                          />
                          {t('locations.inbox.suggestedPin', 'GPS suggestion')}
                        </span>
                      </div>
                      {!target && (
                        <p className="flex items-center gap-1.5 text-xs text-warning">
                          <HelpCircle className="h-3.5 w-3.5" />
                          {t(
                            'locations.inbox.noMatch',
                            'No matching record found for this name — the pin cannot be moved automatically.',
                          )}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={!target || busy}
                          onClick={() => void handleMovePin(s)}
                        >
                          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {t('locations.inbox.movePin', 'Move pin')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleKeepCurrent(s)}
                        >
                          {t('locations.inbox.keepCurrent', 'Keep current')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------- Section C: unknown terminal names ---------------- */}
          {unknownTerminals.length > 0 && (
            <UnknownTerminalsSection unknownTerminals={unknownTerminals} terminals={terminals} />
          )}
        </>
      )}

      {/* Review / set-pin dialog (Section A) */}
      <LocationsDropoffDialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        dropoff={reviewTarget?.dropoff ?? null}
        initialPin={
          reviewTarget?.suggestion
            ? {
                lat: reviewTarget.suggestion.suggested_lat,
                lng: reviewTarget.suggestion.suggested_lng,
              }
            : null
        }
        pinSourceOnSave={reviewTarget?.suggestion ? 'gps_suggested' : 'manual'}
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
            await ackSuggestion.mutateAsync({
              id: reviewTarget.suggestion.id,
              status: 'accepted',
            });
          }
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section C                                                                   */
/* -------------------------------------------------------------------------- */

function UnknownTerminalsSection({
  unknownTerminals,
  terminals,
}: {
  unknownTerminals: UnknownTerminal[];
  terminals: Terminal[];
}) {
  const { t } = useTranslation();
  const addAlias = useAddTerminalAlias();

  // Per-row selected terminal (keyed by the unknown name)
  const [selected, setSelected] = React.useState<Record<string, string>>({});
  const [busyName, setBusyName] = React.useState<string | null>(null);

  const handleLink = async (unknown: UnknownTerminal) => {
    const terminalId = Number(selected[unknown.name]);
    if (!terminalId) return;
    setBusyName(unknown.name);
    try {
      await addAlias.mutateAsync({ terminalId, alias: unknown.name });
    } catch {
      // Toast handled by the mutation
    } finally {
      setBusyName(null);
    }
  };

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Link2 className="h-4 w-4" />}
        title={t('locations.inbox.unknownTitle', 'Unknown terminal names')}
        count={unknownTerminals.length}
      />
      <div className="divide-y overflow-hidden rounded-lg border bg-card">
        {unknownTerminals.map((unknown) => {
          const busy = busyName === unknown.name;
          return (
            <div
              key={unknown.name}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-sm">
                <span dir="auto" className="font-medium">
                  {unknown.name}
                </span>{' '}
                <span className="text-muted-foreground">
                  {t('locations.inbox.unknownText', {
                    trips: unknown.trip_rows,
                    defaultValue: 'appears in {{trips}} trips but matches no terminal',
                  })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NativeSelect
                  className="w-56"
                  value={selected[unknown.name] ?? ''}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [unknown.name]: e.target.value }))
                  }
                >
                  <option value="">
                    {t('locations.inbox.selectTerminal', 'Select terminal…')}
                  </option>
                  {terminals.map((term) => (
                    <option key={term.ID} value={term.ID}>
                      {term.name}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!selected[unknown.name] || busy}
                  onClick={() => void handleLink(unknown)}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  {t('locations.inbox.linkAlias', 'Link as alias')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          'locations.inbox.createHint',
          'A truly new terminal must first be created in the database — then link its trip-data spellings here.',
        )}
      </p>
    </section>
  );
}
