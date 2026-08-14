import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Split, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect } from '@/shared/ui/native-select';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { addMoneyStrings, formatMoney, trimMoney } from '@/shared/lib/money';
import {
  categoryLabel,
  requiresParty,
  useCategories,
  type PartyKind,
} from '@/entities/transaction/categories';
import {
  useSaveSplit,
  useTransactionSplit,
  useUnsplit,
} from '@/entities/transaction/queries';
import {
  isSplitChild,
  type SplitPartInput,
  type Transaction,
} from '@/entities/transaction/schemas';
import { SmartPartyField, type PartyValue } from './party-picker';

/* -------------------------------------------------------------------------- */
/* Split editor                                                                */
/*                                                                            */
/* ONE sheet for every entry point: splitting an unsplit cash-out row (from    */
/* its edit screen or the ledger row action) and editing an existing set       */
/* (from a child's chip or edit screen). Which mode applies is read off the    */
/* row itself: a split child loads the whole set via GET .../split; anything   */
/* else IS the parent-to-be.                                                   */
/*                                                                            */
/* The source amount is a fixed header; parts are amount + category (+ the     */
/* SmartPartyField when the category needs a person); a live remainder line    */
/* does EXACT decimal math through addMoneyStrings — never a float — and the   */
/* save button stays disabled until the remainder is exactly zero, because     */
/* the server rejects any other sum with a 400 anyway.                         */
/*                                                                            */
/* Saving POSTs a new split or PUTs a replacement part set, always with the    */
/* PARENT's version as If-Match. Unsplit dissolves the set behind a confirm.   */
/* -------------------------------------------------------------------------- */

/** Same shape the transaction form accepts: NUMERIC(18,4)'s decimal strings. */
const AMOUNT_RE = /^\d+(\.\d{1,4})?$/;

/** "0", "0.00", "0.0000" — an exactly-allocated remainder. */
function isZeroMoney(value: string): boolean {
  return /^0(\.0*)?$/.test(value);
}

interface PartDraft {
  /** Local list key — stable across removes, never sent to the server. */
  key: number;
  amount: string;
  category: string;
  party: PartyValue;
  /** History suggestion off for loaded parts that already name a person. */
  suggest: boolean;
  /** Not surfaced here, but carried so replacing the set doesn't wipe them. */
  description?: string;
  paid_by?: string;
  car_id?: number;
}

interface SplitEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** An unsplit cash-out row (new split) OR any split child (edit the set). */
  row: Transaction | null;
  /**
   * Called after a successful save/unsplit, after the sheet closes. The edit
   * screens pass their leave-navigation: a saved split replaces the row set,
   * so the screen underneath is stale either way.
   */
  onDone?: () => void;
  canEdit: boolean;
}

export function SplitEditor({ open, onOpenChange, row, onDone, canEdit }: SplitEditorProps) {
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const save = useSaveSplit();
  const unsplit = useUnsplit();

  const editing = !!row && isSplitChild(row);
  const splitQuery = useTransactionSplit(open && editing ? row.id : undefined);
  const set = editing ? splitQuery.data : undefined;

  /** The row whose amount is being divided — and whose version is If-Match. */
  const parent = editing ? set?.parent : row;

  const [drafts, setDrafts] = React.useState<PartDraft[]>([]);
  const [confirmUnsplit, setConfirmUnsplit] = React.useState(false);
  // Hydrate once per open; a background refetch must not clobber typing.
  const dirtyRef = React.useRef(false);
  const keyRef = React.useRef(0);

  const nextKey = () => ++keyRef.current;
  const emptyDraft = (): PartDraft => ({
    key: nextKey(),
    amount: '',
    category: '',
    party: { driver_id: null, employee_id: null },
    suggest: true,
  });

  React.useEffect(() => {
    if (!open) {
      dirtyRef.current = false;
      return;
    }
    if (dirtyRef.current || !row) return;
    if (editing) {
      if (!set) return;
      setDrafts(
        set.parts.map((p) => ({
          key: nextKey(),
          amount: trimMoney(p.amount),
          category: p.category ?? '',
          party: { driver_id: p.driver_id ?? null, employee_id: p.employee_id ?? null },
          suggest: !p.driver_id && !p.employee_id,
          description: p.description ?? undefined,
          paid_by: p.paid_by ?? undefined,
          car_id: p.car_id ?? undefined,
        })),
      );
    } else {
      setDrafts([emptyDraft(), emptyDraft()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, row?.id, set]);

  const catByKey = React.useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.key, c])),
    [categories.data],
  );

  const patchDraft = (key: number, patch: Partial<PartDraft>) => {
    dirtyRef.current = true;
    setDrafts((all) => all.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };
  const addDraft = () => {
    dirtyRef.current = true;
    setDrafts((all) => [...all, emptyDraft()]);
  };
  const removeDraft = (key: number) => {
    dirtyRef.current = true;
    setDrafts((all) => (all.length > 2 ? all.filter((d) => d.key !== key) : all));
  };

  /* ── The live remainder — exact decimal-string arithmetic ── */
  const remainder = React.useMemo(
    () =>
      addMoneyStrings([
        parent?.amount ?? '0',
        ...drafts.map((d) => (d.amount.trim() ? `-${d.amount.trim()}` : '0')),
      ]),
    [parent?.amount, drafts],
  );
  const allocatedAll = isZeroMoney(remainder);
  const overAllocated = remainder.startsWith('-');

  const amountsValid = drafts.every(
    (d) => AMOUNT_RE.test(d.amount.trim()) && /[1-9]/.test(d.amount),
  );
  const partiesOk = drafts.every((d) => {
    const cat = catByKey.get(d.category);
    return !requiresParty(cat) || !!d.party.driver_id || !!d.party.employee_id;
  });

  const busy = save.isPending || unsplit.isPending;
  const canSave =
    canEdit && !!parent && drafts.length >= 2 && amountsValid && allocatedAll && partiesOk && !busy;

  const finish = () => {
    onOpenChange(false);
    onDone?.();
  };

  const submit = () => {
    if (!parent || !canSave) return;
    const parts: SplitPartInput[] = drafts.map((d) => {
      const cat = catByKey.get(d.category);
      const part: SplitPartInput = { amount: d.amount.trim() };
      if (d.category) part.category = d.category;
      if (requiresParty(cat)) {
        if (d.party.driver_id) part.driver_id = d.party.driver_id;
        if (d.party.employee_id) part.employee_id = d.party.employee_id;
      }
      if (d.description) part.description = d.description;
      if (d.paid_by) part.paid_by = d.paid_by;
      if (d.car_id != null) part.car_id = d.car_id;
      return part;
    });
    save.mutate(
      { id: parent.id, version: parent.version, parts, replace: editing },
      { onSuccess: finish },
    );
  };

  const currency = parent?.currency ?? 'EGP';
  const loadFailed = editing && splitQuery.isError;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl p-0"
        >
          {/* ── Fixed header: the amount being divided ── */}
          <div className="shrink-0 border-b px-4 py-3 pe-12">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Split className="h-4 w-4 shrink-0 text-primary" />
              <span dir="auto">
                {parent
                  ? t('fleetExpenses.split.title', {
                      amount: `${formatMoney(parent.amount)} ${currency}`,
                    })
                  : t('fleetExpenses.split.action')}
              </span>
            </h3>
            {parent?.counterparty && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="auto">
                {parent.counterparty}
              </p>
            )}
          </div>

          {/* ── Parts ── */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {editing && splitQuery.isLoading ? (
              <>
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </>
            ) : loadFailed ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {t('fleetExpenses.split.loadFailed')}
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {drafts.map((draft, index) => {
                    const cat = catByKey.get(draft.category);
                    const needsParty = requiresParty(cat);
                    const partyMissing =
                      needsParty && !draft.party.driver_id && !draft.party.employee_id;
                    return (
                      <li key={draft.key} className="space-y-2 rounded-lg border bg-card p-3">
                        <div className="flex min-h-6 items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('fleetExpenses.split.part', { n: index + 1 })}
                          </span>
                          {drafts.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeDraft(draft.key)}
                              disabled={busy}
                              aria-label={t('fleetExpenses.split.removePart')}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t('fleetExpenses.fields.amount')}</Label>
                            <Input
                              inputMode="decimal"
                              dir="ltr"
                              placeholder="0.00"
                              value={draft.amount}
                              disabled={busy}
                              onChange={(e) => patchDraft(draft.key, { amount: e.target.value })}
                              className="tabular-nums"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              {t('fleetExpenses.fields.expenseType')}
                            </Label>
                            <NativeSelect
                              value={draft.category}
                              disabled={busy}
                              onChange={(e) => patchDraft(draft.key, { category: e.target.value })}
                            >
                              <option value="">{t('common.none')}</option>
                              {(categories.data ?? []).map((c) => (
                                <option key={c.key} value={c.key}>
                                  {categoryLabel(c, i18n.language)}
                                </option>
                              ))}
                            </NativeSelect>
                          </div>
                        </div>

                        {needsParty && (
                          <div className="space-y-1">
                            <Label className="text-xs">{t('fleetExpenses.toWhom')}</Label>
                            <SmartPartyField
                              counterparty={parent?.counterparty}
                              suggest={draft.suggest}
                              value={draft.party}
                              onChange={(party) => patchDraft(draft.key, { party })}
                              disabled={busy}
                              required={(cat?.required_party ?? 'either') as PartyKind}
                            />
                            {partyMissing && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {t('fleetExpenses.partyRequired')}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full border-dashed sm:min-h-9"
                  onClick={addDraft}
                  disabled={busy}
                >
                  <Plus className="h-4 w-4" />
                  {t('fleetExpenses.split.addPart')}
                </Button>
              </>
            )}
          </div>

          {/* ── Fixed footer: live remainder + actions ── */}
          <div className="shrink-0 space-y-2.5 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {parent && !loadFailed && (
              <p
                dir="auto"
                aria-live="polite"
                className={cn(
                  'text-sm font-medium tabular-nums',
                  overAllocated
                    ? 'text-destructive'
                    : allocatedAll
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400',
                )}
              >
                {overAllocated
                  ? t('fleetExpenses.split.overAllocated', {
                      amount: formatMoney(remainder.slice(1)),
                    })
                  : allocatedAll
                    ? t('fleetExpenses.split.fullyAllocated')
                    : t('fleetExpenses.split.remaining', {
                        remaining: formatMoney(remainder),
                        total: formatMoney(parent.amount),
                      })}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {editing && canEdit && !loadFailed && (
                <Button
                  type="button"
                  variant="ghost"
                  className="order-3 min-h-10 w-full text-destructive hover:text-destructive sm:order-1 sm:me-auto sm:min-h-9 sm:w-auto"
                  onClick={() => setConfirmUnsplit(true)}
                  disabled={busy || !set}
                >
                  {t('fleetExpenses.split.unsplit')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="order-1 min-h-11 flex-1 sm:order-2 sm:min-h-9 sm:flex-none"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="order-2 min-h-11 flex-1 sm:order-3 sm:min-h-9 sm:flex-none"
                onClick={submit}
                disabled={!canSave}
              >
                {save.isPending ? t('common.saving') : t('fleetExpenses.split.save')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmUnsplit}
        onOpenChange={setConfirmUnsplit}
        stacked
        title={t('fleetExpenses.split.unsplitConfirmTitle')}
        description={t('fleetExpenses.split.unsplitConfirmDescription', {
          amount: parent ? `${formatMoney(parent.amount)} ${currency}` : '',
        })}
        confirmLabel={t('fleetExpenses.split.unsplit')}
        variant="destructive"
        loading={unsplit.isPending}
        onConfirm={() => {
          if (!set) return;
          unsplit.mutate(
            { id: set.parent.id, version: set.parent.version },
            {
              onSuccess: () => {
                setConfirmUnsplit(false);
                finish();
              },
              onError: () => setConfirmUnsplit(false),
            },
          );
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* SplitChip — the compact "part of 20,000.00" marker on child rows            */
/* -------------------------------------------------------------------------- */

export function SplitChip({
  row,
  siblings,
  onOpen,
  className,
}: {
  row: Transaction;
  /** Ids of loaded rows sharing this parent, in list order (for "n of m"). */
  siblings?: number[];
  onOpen: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (row.parent_amount == null) return null;

  const amount = formatMoney(row.parent_amount);
  const index = siblings ? siblings.indexOf(row.id) : -1;
  const label =
    siblings && siblings.length > 1 && index >= 0
      ? t('fleetExpenses.split.chipNOfM', { n: index + 1, m: siblings.length, amount })
      : t('fleetExpenses.split.chipPartOf', { amount });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15',
        className,
      )}
    >
      <Split className="h-3 w-3 shrink-0" />
      <span className="tabular-nums" dir="auto">
        {label}
      </span>
    </button>
  );
}
