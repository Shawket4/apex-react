import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MapPinOff,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
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
import type {
  DropOffPoint,
  PinSuggestion,
  Terminal,
} from '@/entities/location/schemas';
import { LocationsDropoffDialog } from '../locations-dropoff-dialog';
import { LocationsTerminalDialog } from '../locations-terminal-dialog';
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

function KindBadge({ kind }: { kind: PinSuggestion['kind'] }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline">
      {kind === 'terminal'
        ? t('locations.kind.terminal', 'Terminal')
        : t('locations.kind.dropoff', 'Drop-off')}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Widget                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * "Needs Attention" inbox.
 *
 * Sections, fed from the FalconGo inbox endpoint plus (when the etit proxy
 * is reachable) GPS-derived pin suggestions:
 *   A. Drop-off points with no pin — [Review] a GPS suggestion or [Set pin]
 *      manually. Capped at 50 rows server-side; `total_unpinned` shows the
 *      full backlog.
 *   B. Terminals without pins — GPS set-pin suggestions for terminals
 *      (kind='terminal', no stored pin): apply the suggested pin or dismiss.
 *   C. Pin mismatches — GPS cluster sits far from the stored pin (terminal
 *      or drop-off); move the pin to the suggestion or keep the current one.
 *   D. Provisional GPS pins — pins the proxy already auto-applied
 *      (status='auto_applied', pin_source='gps_suggested'): [Confirm] locks
 *      them in as manual, [Adjust] opens the pin editor.
 *
 * The drop-off list endpoint is paginated now, so drop-off records are
 * resolved by a targeted name search at action time instead of an
 * everything-fetch.
 *
 * The suggestions fetch failing (service not deployed yet) only hides the
 * GPS hints; section A keeps rendering from the database inbox.
 */
export function LocationsNeedsAttention() {
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
  const pendingSuggestions = React.useMemo(
    () => (suggestionsQuery.data ?? []).filter((s) => s.status === 'pending'),
    [suggestionsQuery.data],
  );
  const provisionalSuggestions = React.useMemo(
    () => (autoAppliedQuery.data ?? []).filter((s) => s.status === 'auto_applied'),
    [autoAppliedQuery.data],
  );

  /** Section C: suggestions that disagree with an existing stored pin. */
  const mismatches = React.useMemo(
    () =>
      pendingSuggestions.filter(
        (s) => s.current_lat != null && s.current_lng != null && (s.offset_m ?? 0) > 0,
      ),
    [pendingSuggestions],
  );

  /** Section B: terminal set-pin suggestions (no stored pin yet). */
  const terminalSetPins = React.useMemo(
    () => pendingSuggestions.filter((s) => s.kind === 'terminal' && s.current_lat == null),
    [pendingSuggestions],
  );

  /** New-pin drop-off suggestions — matched to unpinned drop-offs by name. */
  const newPinSuggestions = React.useMemo(
    () => pendingSuggestions.filter((s) => s.kind === 'dropoff' && s.current_lat == null),
    [pendingSuggestions],
  );

  const findSuggestionFor = React.useCallback(
    (dropoff: DropOffPoint): PinSuggestion | null =>
      newPinSuggestions.find((s) => sameName(s.name, dropoff.name)) ?? null,
    [newPinSuggestions],
  );

  const findTerminalByName = React.useCallback(
    (name: string): Terminal | null =>
      terminals.find((term) => sameName(term.name, name)) ?? null,
    [terminals],
  );

  /**
   * Drop-off lookup by name via the paginated search endpoint — the full
   * list can no longer be fetched wholesale.
   */
  const findDropoffByName = React.useCallback(
    async (name: string): Promise<DropOffPoint | null> => {
      try {
        const page = await locationApi.listDropoffs({ q: name, per_page: 10 });
        return page.items.find((d) => sameName(d.name, name)) ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  /* ---- Pin editor dialog state (sections A + D adjust) ---- */
  const [reviewTarget, setReviewTarget] = React.useState<{
    dropoff: DropOffPoint;
    suggestion: PinSuggestion | null;
    /** pin_source stored on save. */
    pinSource: string;
  } | null>(null);

  /* ---- Terminal editor state (section D adjust, terminal kind) ---- */
  const [terminalTarget, setTerminalTarget] = React.useState<{
    terminal: Terminal;
    suggestion: PinSuggestion;
  } | null>(null);

  /* ---- Per-row busy tracking ---- */
  const [busySuggestionId, setBusySuggestionId] = React.useState<number | null>(null);

  const notFoundToast = () =>
    toast.error(
      t(
        'locations.inbox.noMatch',
        'No matching record found for this name — the pin cannot be moved automatically.',
      ),
    );

  const handleMovePin = async (s: PinSuggestion) => {
    setBusySuggestionId(s.id);
    try {
      if (s.kind === 'dropoff') {
        const dropoff = await findDropoffByName(s.name);
        if (!dropoff) {
          notFoundToast();
          return;
        }
        await updateDropoff.mutateAsync({
          id: dropoff.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng, pin_source: 'gps_suggested' },
        });
      } else {
        const terminal = findTerminalByName(s.name);
        if (!terminal) {
          notFoundToast();
          return;
        }
        await updateTerminal.mutateAsync({
          id: terminal.ID,
          payload: {
            lat: s.suggested_lat,
            long: s.suggested_lng,
            pin_source: 'gps_suggested',
          },
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

  /* ---- Section D: provisional (auto-applied) pins ---- */

  /** [Confirm]: re-save the same coords with pin_source='manual', then ack. */
  const handleConfirmProvisional = async (s: PinSuggestion) => {
    setBusySuggestionId(s.id);
    try {
      if (s.kind === 'dropoff') {
        const dropoff = await findDropoffByName(s.name);
        if (!dropoff) {
          notFoundToast();
          return;
        }
        await updateDropoff.mutateAsync({
          id: dropoff.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng, pin_source: 'manual' },
        });
      } else {
        const terminal = findTerminalByName(s.name);
        if (!terminal) {
          notFoundToast();
          return;
        }
        await updateTerminal.mutateAsync({
          id: terminal.ID,
          payload: { lat: s.suggested_lat, long: s.suggested_lng, pin_source: 'manual' },
        });
      }
      await ackSuggestion.mutateAsync({ id: s.id, status: 'accepted' });
    } catch {
      // Toasts handled by the mutations
    } finally {
      setBusySuggestionId(null);
    }
  };

  /** [Adjust]: open the pin editor seeded with the applied position. */
  const handleAdjustProvisional = async (s: PinSuggestion) => {
    setBusySuggestionId(s.id);
    try {
      if (s.kind === 'dropoff') {
        const dropoff = await findDropoffByName(s.name);
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
  const totalUnpinned = inbox?.total_unpinned ?? unpinned.length;
  const isEmpty =
    unpinned.length === 0 &&
    mismatches.length === 0 &&
    terminalSetPins.length === 0 &&
    provisionalSuggestions.length === 0;

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
                count={totalUnpinned}
              />
              {totalUnpinned > unpinned.length && (
                <p className="text-xs text-muted-foreground">
                  {t('locations.inbox.unpinnedCapped', {
                    shown: unpinned.length,
                    total: totalUnpinned,
                    defaultValue:
                      'Showing the first {{shown}} of {{total}} unpinned drop-off points.',
                  })}
                </p>
              )}
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
                            onClick={() =>
                              setReviewTarget({
                                dropoff,
                                suggestion,
                                pinSource: 'gps_suggested',
                              })
                            }
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {t('locations.inbox.review', 'Review')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setReviewTarget({ dropoff, suggestion: null, pinSource: 'manual' })
                            }
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

          {/* ---------------- Section B: terminals without pins ---------------- */}
          {terminalSetPins.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<MapPinOff className="h-4 w-4" />}
                title={t('locations.inbox.unpinnedTerminalsTitle', 'Terminals without pins')}
                count={terminalSetPins.length}
              />
              <div className="space-y-3">
                {terminalSetPins.map((s) => {
                  const target = findTerminalByName(s.name);
                  const busy = busySuggestionId === s.id;
                  return (
                    <div key={s.id} className="space-y-3 rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium" dir="auto">
                          {s.name}
                        </span>
                        <KindBadge kind={s.kind} />
                      </div>
                      <p className="flex items-center gap-1.5 text-sm text-success">
                        <Sparkles className="h-3.5 w-3.5" />
                        {t('locations.inbox.gpsSuggests', {
                          stops: s.stop_count,
                          defaultValue: 'GPS suggests a pin from {{stops}} stops',
                        })}
                      </p>
                      <LocationsMapPicker
                        lat={null}
                        lng={null}
                        secondary={{
                          lat: s.suggested_lat,
                          lng: s.suggested_lng,
                          color: SUGGESTED_PIN_COLOR,
                          title: t('locations.inbox.suggestedPin', 'GPS suggestion'),
                        }}
                        className="h-[220px]"
                      />
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
                          {t('locations.inbox.applyPin', 'Apply pin')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleKeepCurrent(s)}
                        >
                          {t('locations.inbox.dismiss', 'Dismiss')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------- Section C: pin mismatches ---------------- */}
          {mismatches.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<ArrowRightLeft className="h-4 w-4" />}
                title={t('locations.inbox.mismatchTitle', 'Pin mismatches')}
                count={mismatches.length}
              />
              <div className="space-y-3">
                {mismatches.map((s) => {
                  // Only terminal targets can be verified synchronously —
                  // drop-offs are resolved by search when the action runs.
                  const terminalMissing =
                    s.kind === 'terminal' && !findTerminalByName(s.name);
                  const busy = busySuggestionId === s.id;
                  return (
                    <div key={s.id} className="space-y-3 rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium" dir="auto">
                          {s.name}
                        </span>
                        <KindBadge kind={s.kind} />
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
                      {terminalMissing && (
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
                          disabled={terminalMissing || busy}
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

          {/* ---------------- Section D: provisional GPS pins ---------------- */}
          {provisionalSuggestions.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<Sparkles className="h-4 w-4" />}
                title={t('locations.inbox.provisionalTitle', 'Provisional GPS pins')}
                count={provisionalSuggestions.length}
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'locations.inbox.provisionalHelper',
                  'These pins were applied automatically from GPS stop clusters. Confirm to keep them, or adjust the position.',
                )}
              </p>
              <div className="space-y-3">
                {provisionalSuggestions.map((s) => {
                  const busy = busySuggestionId === s.id;
                  return (
                    <div key={s.id} className="space-y-3 rounded-lg border bg-card p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium" dir="auto">
                          {s.name}
                        </span>
                        <KindBadge kind={s.kind} />
                        <Badge variant="success">
                          {t('locations.pinSource.gpsSuggested', 'GPS (provisional)')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('locations.inbox.provisionalText', {
                          stops: s.stop_count,
                          defaultValue: 'Pin applied automatically from {{stops}} GPS stops',
                        })}
                      </p>
                      <LocationsMapPicker
                        lat={s.suggested_lat}
                        lng={s.suggested_lng}
                        primaryColor={SUGGESTED_PIN_COLOR}
                        primaryTitle={s.name}
                        className="h-[220px]"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy}
                          onClick={() => void handleConfirmProvisional(s)}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {t('locations.inbox.confirmPin', 'Confirm')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={busy}
                          onClick={() => void handleAdjustProvisional(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('locations.inbox.adjustPin', 'Adjust')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Drop-off pin editor (sections A + D) */}
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
            await ackSuggestion.mutateAsync({
              id: reviewTarget.suggestion.id,
              status: 'accepted',
            });
          }
        }}
      />

      {/* Terminal pin editor (section D adjust, terminal kind) */}
      <LocationsTerminalDialog
        terminal={terminalTarget?.terminal ?? null}
        onOpenChange={(open) => {
          if (!open) setTerminalTarget(null);
        }}
        onSaved={async () => {
          if (terminalTarget) {
            await ackSuggestion.mutateAsync({
              id: terminalTarget.suggestion.id,
              status: 'accepted',
            });
          }
        }}
      />
    </div>
  );
}
