import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fuel, HandCoins, Lock, PenLine } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { NativeSelect } from '@/shared/ui/native-select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import { cairoDayKey, formatCairoDay, formatCairoTime, formatCairoDate } from '@/shared/lib/cairo';
import {
  categoryLabel,
  posts,
  requiresParty,
  useCategories,
  type Category,
  type PartyKind,
} from '@/entities/transaction/categories';
import { useUpdateTransaction } from '@/entities/transaction/queries';
import type { ByDate, Transaction } from '@/entities/transaction/schemas';
import { SmartPartyField, type PartyValue } from './party-picker';

/* -------------------------------------------------------------------------- */
/* Day grouping                                                                */
/*                                                                            */
/* Rows arrive ordered occurred_at DESC from the API, so grouping is a single  */
/* sequential pass — a day split across two fetched pages still lands in one   */
/* group. Day TOTALS never come from these rows: they are looked up in         */
/* statistics.by_date, which the server computed over the whole filtered set   */
/* in exact decimal. No client float sums, ever.                               */
/* -------------------------------------------------------------------------- */

interface DayGroup {
  key: string;
  rows: Transaction[];
}

function groupByCairoDay(rows: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | null = null;
  for (const row of rows) {
    const key = cairoDayKey(row.occurred_at);
    if (!current || current.key !== key) {
      current = { key, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
}

/* -------------------------------------------------------------------------- */
/* Inline category flow                                                        */
/* -------------------------------------------------------------------------- */

type CategoryFlow =
  | { row: Transaction; step: 'category' }
  | { row: Transaction; step: 'party'; category: Category };

/* -------------------------------------------------------------------------- */
/* Widget                                                                      */
/* -------------------------------------------------------------------------- */

interface LedgerListProps {
  rows: Transaction[];
  /** statistics.by_date, keyed by Cairo day — the only source of day totals. */
  dayTotals: Map<string, ByDate>;
  canEdit: boolean;
}

/**
 * The day-grouped transaction list with STICKY day headers.
 *
 * Stickiness silently no-ops under the wrong ancestors, so the structure is
 * deliberate: the app's scroll root is the layout's `<main>` (the app bar sits
 * OUTSIDE it, so the correct offset is `top-0`), and nothing between these
 * headers and `<main>` — this widget, PageShell, or the page — may have
 * non-visible overflow. That is why there is no rounded `overflow-hidden`
 * card around the list and no `overflow-x-auto` around the desktop table;
 * the table uses `table-fixed` + truncation for width containment instead.
 */
export function LedgerList({ rows, dayTotals, canEdit }: LedgerListProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const categories = useCategories();
  const update = useUpdateTransaction();

  const [flow, setFlow] = React.useState<CategoryFlow | null>(null);
  const [party, setParty] = React.useState<PartyValue>({ driver_id: null, employee_id: null });

  const groups = React.useMemo(() => groupByCairoDay(rows), [rows]);
  const catByKey = React.useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.key, c])),
    [categories.data],
  );

  const openEdit = (row: Transaction) => {
    if (!canEdit || !row.editable) return;
    navigate(`/fleet-expenses/${row.id}/edit`, { state: { from: 'ledger' } });
  };

  /** A category was picked for a row (from the select or the sheet). */
  const pickCategory = (row: Transaction, key: string) => {
    const cat = catByKey.get(key);
    if (!cat) return;
    if (requiresParty(cat) || posts(cat)) {
      // Two-step: the category needs a person. One PATCH at the end.
      setParty({ driver_id: null, employee_id: null });
      setFlow({ row, step: 'party', category: cat });
      return;
    }
    update.mutate(
      { id: row.id, version: row.version, values: { category: key } },
      { onSuccess: () => setFlow(null) },
    );
  };

  const saveWithParty = () => {
    if (flow?.step !== 'party') return;
    if (!party.driver_id && !party.employee_id) return;
    update.mutate(
      {
        id: flow.row.id,
        version: flow.row.version,
        values: {
          category: flow.category.key,
          driver_id: party.driver_id,
          employee_id: party.employee_id,
        },
      },
      { onSuccess: () => setFlow(null) },
    );
  };

  return (
    <div>
      {groups.map((group, index) => {
        const total = dayTotals.get(group.key);
        return (
          // Keyed with the index too: the API orders rows occurred_at DESC so
          // a day never repeats, but a duplicate React key would silently
          // drop rows if that ordering ever hiccuped.
          <section key={`${group.key}-${index}`}>
            {/* Sticky day header — top-0 because the app bar is outside the
                scroll root. bg required: content scrolls beneath it. */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-y bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <span>{formatCairoDay(group.key, i18n.language)}</span>
              {total && (
                <span className="tabular-nums" dir="ltr">
                  − {formatMoney(total.out)}
                </span>
              )}
            </div>

            {/* Phones ≤ lg: cards. */}
            <ul className="lg:hidden">
              {group.rows.map((row) => (
                <li key={`${row.source}-${row.id}`}>
                  <TxnCard
                    row={row}
                    canEdit={canEdit}
                    catByKey={catByKey}
                    onOpen={() => openEdit(row)}
                    onAddCategory={() => setFlow({ row, step: 'category' })}
                  />
                </li>
              ))}
            </ul>

            {/* Desktop: a table per day. table-fixed with shared widths keeps
                columns aligned across day groups without an overflow wrapper. */}
            <table className="hidden w-full table-fixed text-sm lg:table">
              <tbody>
                {group.rows.map((row) => (
                  <TxnRow
                    key={`${row.source}-${row.id}`}
                    row={row}
                    canEdit={canEdit}
                    catByKey={catByKey}
                    categories={categories.data ?? []}
                    saving={update.isPending}
                    onOpen={() => openEdit(row)}
                    onPickCategory={(key) => pickCategory(row, key)}
                  />
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {/* Bottom sheet: category step (mobile) and "to whom?" step (both). */}
      <Sheet open={!!flow} onOpenChange={(open) => !open && setFlow(null)}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[80dvh] max-w-lg overflow-y-auto rounded-t-2xl p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {flow?.step === 'category' && (
            <div className="space-y-3">
              <SheetHeading
                title={t('fleetExpenses.chooseCategory')}
                subtitle={flow.row.counterparty || flow.row.description || ''}
              />
              <div className="grid grid-cols-2 gap-2">
                {(categories.data ?? []).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    disabled={update.isPending}
                    onClick={() => pickCategory(flow.row, c.key)}
                    className="min-h-11 rounded-lg border px-3 py-2 text-start text-sm font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {categoryLabel(c, i18n.language)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {flow?.step === 'party' && (
            <div className="space-y-4">
              <SheetHeading
                title={t('fleetExpenses.toWhom')}
                subtitle={`${categoryLabel(flow.category, i18n.language)} · ${formatMoney(flow.row.amount)}`}
              />
              {/* History-aware: an exact counterparty match pre-selects the
                  person as a visible card; "Someone else" restores the picker.
                  Advancing becomes: pick category → see person → save. */}
              <SmartPartyField
                counterparty={flow.row.counterparty}
                value={party}
                onChange={setParty}
                required={(flow.category.required_party || 'either') as PartyKind}
              />
              {posts(flow.category) && (
                <p className="text-xs text-muted-foreground">
                  {t('fleetExpenses.party.postsNow')}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 flex-1 sm:min-h-9"
                  onClick={() => setFlow(null)}
                  disabled={update.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="min-h-11 flex-1 sm:min-h-9"
                  onClick={saveWithParty}
                  disabled={update.isPending || (!party.driver_id && !party.employee_id)}
                >
                  {update.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SheetHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle ? (
        <p className="truncate text-xs text-muted-foreground" dir="auto">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The effective amount, signed by direction. Received money is the rare case
 * so it gets the colour; spending stays quiet ink. When the bank bundled the
 * 0.1% IPN fee, the derived split shows on hover.
 */
function Amount({ row, className }: { row: Transaction; className?: string }) {
  const { t } = useTranslation();
  const isIn = row.direction === 'in';
  const text = `${isIn ? '+' : '−'} ${formatMoney(row.amount)}${
    row.currency && row.currency !== 'EGP' ? ` ${row.currency}` : ''
  }`;

  const span = (
    <span
      dir="ltr"
      className={cn(
        'whitespace-nowrap font-semibold tabular-nums',
        isIn && 'text-emerald-600 dark:text-emerald-400',
        row.fee != null && 'cursor-help border-b border-dotted border-muted-foreground/50',
        className,
      )}
    >
      {text}
    </span>
  );

  if (row.fee == null) return span;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{span}</TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5 text-xs" dir="ltr">
          <div>
            {t('fleetExpenses.principal')}: {formatMoney(row.principal)}
          </div>
          <div>
            {t('fleetExpenses.fields.fee')}: {formatMoney(row.fee)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Category chip for categorized rows. */
function CategoryChip({
  row,
  catByKey,
}: {
  row: Transaction;
  catByKey: Map<string, Category>;
}) {
  const { i18n } = useTranslation();
  if (!row.category) return null;
  const cat = catByKey.get(row.category);
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {cat ? categoryLabel(cat, i18n.language) : row.category}
    </span>
  );
}

function RowFlags({ row }: { row: Transaction }) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {row.source === 'fuel_event' && <Fuel className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
      {row.source === 'loan' && <HandCoins className="h-3.5 w-3.5 shrink-0 text-sky-500" />}
      {!row.editable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{t('fleetExpenses.readOnlySource')}</TooltipContent>
        </Tooltip>
      )}
      {row.edited_by && (
        <Tooltip>
          <TooltipTrigger asChild>
            <PenLine className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
          </TooltipTrigger>
          <TooltipContent>
            {t('fleetExpenses.editedBy', {
              name: row.edited_by,
              date: row.edited_at ? formatCairoDate(row.edited_at, i18n.language) : '',
            })}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile card                                                                 */
/*                                                                            */
/* Amount owns the right edge; references wrap (`overflow-wrap: anywhere`) so  */
/* a bare-hex token cannot force horizontal scroll at 375px; Arabic renders    */
/* dir="auto". No fixed columns.                                               */
/* -------------------------------------------------------------------------- */

function TxnCard({
  row,
  canEdit,
  catByKey,
  onOpen,
  onAddCategory,
}: {
  row: Transaction;
  canEdit: boolean;
  catByKey: Map<string, Category>;
  onOpen: () => void;
  onAddCategory: () => void;
}) {
  const { t, i18n } = useTranslation();
  const tappable = canEdit && row.editable;

  return (
    <div
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      onClick={tappable ? onOpen : undefined}
      onKeyDown={
        tappable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpen();
            }
          : undefined
      }
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b bg-card px-3 py-3',
        tappable && 'cursor-pointer active:bg-muted/40',
      )}
    >
      <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]" dir="auto">
        {row.counterparty || row.description || '—'}
      </p>
      <Amount row={row} className="text-sm" />

      <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {row.reference && (
          <span className="font-mono text-[11px] [overflow-wrap:anywhere]">{row.reference}</span>
        )}
        {row.account && <span className="tabular-nums">****{row.account}</span>}
        <span className="tabular-nums">{formatCairoTime(row.occurred_at, i18n.language)}</span>
        <RowFlags row={row} />
        {row.category ? (
          <CategoryChip row={row} catByKey={catByKey} />
        ) : canEdit && row.editable ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddCategory();
            }}
            className="min-h-9 rounded-full border border-dashed border-primary/50 px-3 py-0.5 text-xs font-semibold text-primary lg:min-h-8 lg:px-2.5"
          >
            + {t('fleetExpenses.addCategory')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop row                                                                 */
/* -------------------------------------------------------------------------- */

function TxnRow({
  row,
  canEdit,
  catByKey,
  categories,
  saving,
  onOpen,
  onPickCategory,
}: {
  row: Transaction;
  canEdit: boolean;
  catByKey: Map<string, Category>;
  categories: Category[];
  saving: boolean;
  onOpen: () => void;
  onPickCategory: (key: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const tappable = canEdit && row.editable;

  return (
    <tr
      onClick={tappable ? onOpen : undefined}
      className={cn('border-b bg-card', tappable && 'cursor-pointer hover:bg-muted/40')}
    >
      <td className="w-16 whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
        {formatCairoTime(row.occurred_at, i18n.language)}
      </td>
      <td className="px-3 py-2.5">
        <div className="truncate font-medium" dir="auto">
          {row.counterparty || row.description || '—'}
        </div>
        {row.counterparty && row.description && (
          <div className="truncate text-xs text-muted-foreground" dir="auto">
            {row.description}
          </div>
        )}
      </td>
      <td className="w-44 px-3 py-2.5">
        {row.category ? (
          <CategoryChip row={row} catByKey={catByKey} />
        ) : canEdit && row.editable ? (
          /* Native select, on purpose — see NativeSelect. Click must not
             bubble into the row navigation. */
          <span onClick={(e) => e.stopPropagation()}>
            <NativeSelect
              className="w-36"
              value=""
              disabled={saving}
              aria-label={t('fleetExpenses.addCategory')}
              onChange={(e) => {
                if (e.target.value) onPickCategory(e.target.value);
              }}
            >
              <option value="">+ {t('fleetExpenses.addCategory')}</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {categoryLabel(c, i18n.language)}
                </option>
              ))}
            </NativeSelect>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="w-44 truncate px-3 py-2.5 font-mono text-xs text-muted-foreground">
        {row.reference || ''}
      </td>
      <td className="w-24 whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
        {row.account ? `****${row.account}` : ''}
      </td>
      <td className="w-24 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <RowFlags row={row} />
        </div>
      </td>
      <td className="w-36 px-3 py-2.5 text-end">
        <Amount row={row} className="text-sm" />
      </td>
    </tr>
  );
}
