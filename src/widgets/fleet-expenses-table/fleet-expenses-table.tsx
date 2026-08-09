import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Edit,
  Trash2,
  Receipt,
  MessageSquare,
  PenLine,
  ChevronDown,
  Fuel,
  HandCoins,
  Lock,
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, fmtDate } from '@/shared/lib/format';
import type { Transaction } from '@/entities/transaction/schemas';

/* -------------------------------------------------------------------------- */
/* Source presentation                                                         */
/*                                                                            */
/* The legacy module badged rows fleet_expense / fuel_event / loan — three SQL */
/* tables unioned together. The store now records where a row actually came    */
/* from, which is both more honest and more useful: a `whatsapp` row was parsed */
/* from a bank SMS and can be traced back to it.                               */
/* -------------------------------------------------------------------------- */

const SOURCE_CONFIG: Record<
  string,
  { labelKey: string; icon: typeof Receipt; className: string }
> = {
  import: {
    labelKey: 'fleetExpenses.sources.import',
    icon: Receipt,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  whatsapp: {
    labelKey: 'fleetExpenses.sources.whatsapp',
    icon: MessageSquare,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  manual: {
    labelKey: 'fleetExpenses.sources.manual',
    icon: PenLine,
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  fuel_event: {
    labelKey: 'fleetExpenses.sources.fuel_event',
    icon: Fuel,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  loan: {
    labelKey: 'fleetExpenses.sources.loan',
    icon: HandCoins,
    className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
};

export function SourceBadge({ source, compact }: { source: string; compact?: boolean }) {
  const { t } = useTranslation();
  const config = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.manual;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {!compact && t(config.labelKey)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Month grouping                                                              */
/* -------------------------------------------------------------------------- */

export interface MonthGroup {
  key: string;
  label: string;
  rows: Transaction[];
  total: number;
}

function rowDate(row: Transaction): Date | null {
  const iso = row.occurred_at ?? row.created_at;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function groupByMonth(rows: Transaction[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const row of rows) {
    const date = rowDate(row);
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : '—';
    const label = date
      ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
      : '—';

    let group = groups.get(key);
    if (!group) {
      group = { key, label, rows: [], total: 0 };
      groups.set(key, group);
    }
    group.rows.push(row);
    group.total += row.amount ?? 0;
  }

  // Newest month first — what people want when reconciling.
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Shows the effective amount, and the derived principal/fee split where the bank
 * reported a fee-inclusive figure. The split is computed server-side and never
 * stored: some banks bundle the 0.1% IPN fee into the amount, others deduct it
 * separately, and both conventions appear in the same chat.
 */
function AmountCell({ row, className }: { row: Transaction; className?: string }) {
  const { t } = useTranslation();
  const hasFee = (row.fee ?? 0) > 0;
  const text = formatCurrency(row.amount ?? 0);

  if (!hasFee) return <span className={className}>{text}</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-help border-b border-dotted border-muted-foreground/50',
            className,
          )}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5 text-xs">
          <div>
            {t('fleetExpenses.principal')}: {formatCurrency(row.principal ?? 0)}
          </div>
          <div>
            {t('fleetExpenses.fields.fee')}: {formatCurrency(row.fee ?? 0)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** A corrected row keeps the SMS's original reading — the difference between
 *  "the bank said this" and "someone typed this". */
function EditedIndicator({ row }: { row: Transaction }) {
  const { t } = useTranslation();
  const original = row.parsed ?? {};

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="cursor-help gap-1 px-1.5 py-0 text-[10px]">
          <PenLine className="h-2.5 w-2.5" />
          {t('fleetExpenses.edited')}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5 text-xs">
          <div className="font-medium">{t('fleetExpenses.originalReading')}</div>
          {original.amount != null && <div>{formatCurrency(original.amount)}</div>}
          {original.counterparty && <div>{original.counterparty}</div>}
          {original.occurred_at && <div>{fmtDate(original.occurred_at)}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function RowFlags({ row }: { row: Transaction }) {
  const { t } = useTranslation();
  return (
    <>
      {row.has_overrides && <EditedIndicator row={row} />}
      {row.editable === false && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{t('fleetExpenses.readOnlySource')}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

interface Props {
  rows: Transaction[];
  grouped: boolean;
  canEdit: boolean;
  onEdit: (row: Transaction) => void;
  onDelete: (row: Transaction) => void;
}

export function FleetExpensesTable({ rows, grouped, canEdit, onEdit, onDelete }: Props) {
  const groups = React.useMemo(
    () => (grouped ? groupByMonth(rows) : [{ key: 'all', label: '', rows, total: 0 }]),
    [rows, grouped],
  );

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="overflow-hidden rounded-lg border">
          {grouped && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !c[group.key] }))}
              className="flex w-full items-center justify-between gap-2 bg-muted/50 px-3 py-2 text-sm hover:bg-muted sm:px-4"
            >
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform',
                    collapsed[group.key] && '-rotate-90 rtl:rotate-90',
                  )}
                />
                <span className="truncate">{group.label}</span>
                <span className="shrink-0 text-muted-foreground">({group.rows.length})</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatCurrency(group.total)}
              </span>
            </button>
          )}

          {!collapsed[group.key] && (
            <>
              {/*
                Two presentations of the same data rather than one scrolling
                table. A nine-column table on a 375px screen is unusable however
                it is scrolled, so phones get cards and `lg` and up gets the
                table. Both are always in the DOM but only one is displayed, so
                there is no layout flash on resize and no JS breakpoint state.
              */}
              <ul className="divide-y lg:hidden">
                {group.rows.map((row) => (
                  <li key={row.id}>
                    <ExpenseCard
                      row={row}
                      canEdit={canEdit}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                    <tr>
                      <Th>Date</Th>
                      <Th>Description</Th>
                      <Th>Type</Th>
                      {/* Secondary columns appear only once there is room for
                          them. Below xl they would squeeze the amount column
                          off the edge, and the amount is the one value nobody
                          should have to scroll sideways to read. */}
                      <Th className="hidden xl:table-cell">Vehicle</Th>
                      <Th className="hidden xl:table-cell">Company</Th>
                      <Th className="hidden 2xl:table-cell">Method</Th>
                      <Th>Source</Th>
                      <Th className="text-end">Amount</Th>
                      {canEdit && <Th className="text-end">Actions</Th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/40">
                        <Td className="whitespace-nowrap tabular-nums">
                          {fmtDate(row.occurred_at ?? row.created_at)}
                        </Td>
                        <Td className="max-w-[14rem] xl:max-w-[20rem]">
                          <div className="truncate" dir="auto">
                            {row.description || row.counterparty || '—'}
                          </div>
                          {row.reference && (
                            <div className="truncate text-xs text-muted-foreground">
                              {row.reference}
                            </div>
                          )}
                        </Td>
                        <Td>{row.category || '—'}</Td>
                        <Td className="hidden whitespace-nowrap xl:table-cell">
                          {row.car_no_plate || '—'}
                        </Td>
                        <Td className="hidden whitespace-nowrap xl:table-cell">
                          {row.company || '—'}
                        </Td>
                        <Td className="hidden whitespace-nowrap 2xl:table-cell">
                          {row.payment_method || '—'}
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            <SourceBadge source={row.source} />
                            <RowFlags row={row} />
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap text-end font-medium tabular-nums">
                          <AmountCell row={row} />
                        </Td>
                        {canEdit && (
                          <Td className="text-end">
                            <RowActions
                              row={row}
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile card                                                                 */
/* -------------------------------------------------------------------------- */

function ExpenseCard({
  row,
  canEdit,
  onEdit,
  onDelete,
}: {
  row: Transaction;
  canEdit: boolean;
  onEdit: (r: Transaction) => void;
  onDelete: (r: Transaction) => void;
}) {
  const readOnly = row.editable === false;

  // Only the facts that are actually set — a card padded with "—" for every
  // empty column is harder to scan than a short one.
  const facts = [row.category, row.car_no_plate, row.company, row.payment_method].filter(
    (v): v is string => !!v,
  );

  return (
    <div className="space-y-2 p-3 active:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" dir="auto">
            {row.description || row.counterparty || '—'}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {fmtDate(row.occurred_at ?? row.created_at)}
          </p>
        </div>
        <AmountCell
          row={row}
          className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums"
        />
      </div>

      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facts.map((f) => (
            <span
              key={f}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <SourceBadge source={row.source} />
        <RowFlags row={row} />
        {row.reference && (
          <span className="truncate text-xs text-muted-foreground">{row.reference}</span>
        )}

        {canEdit && !readOnly && (
          <span className="ms-auto flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(row)}
              aria-label="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(row)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}

function RowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: Transaction;
  onEdit: (r: Transaction) => void;
  onDelete: (r: Transaction) => void;
}) {
  const { t } = useTranslation();

  // Fuel events and loans are owned by other pipelines. Offering an edit that
  // the next sync would overwrite is worse than offering none.
  if (row.editable === false) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('fleetExpenses.readOnlySource')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={() => onEdit(row)} aria-label="Edit">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(row)} aria-label="Delete">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('px-3 py-2 text-start font-medium', className)}>{children}</th>;
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2', className)}>{children}</td>;
}
