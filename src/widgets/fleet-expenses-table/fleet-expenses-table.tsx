import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Edit,
  Trash2,
  Receipt,
  MessageSquare,
  PenLine,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, fmtDate } from '@/shared/lib/format';
import type { Transaction, TransactionSource } from '@/entities/transaction/schemas';

/* -------------------------------------------------------------------------- */
/* Source presentation                                                         */
/*                                                                            */
/* The legacy module badged rows fleet_expense / fuel_event / loan. Those were */
/* three different SQL tables unioned together. The new store records where a   */
/* row actually came from instead, which is both more honest and more useful:   */
/* `whatsapp` rows were parsed from a bank SMS and can be traced back to it.    */
/* -------------------------------------------------------------------------- */

const SOURCE_CONFIG: Record<
  TransactionSource,
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
};

export function SourceBadge({ source }: { source: string }) {
  const { t } = useTranslation();
  const config = SOURCE_CONFIG[source as TransactionSource] ?? SOURCE_CONFIG.manual;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {t(config.labelKey)}
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
    const key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '—';
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

  // Newest month first — the legacy module did the same, and it is what people
  // want when reconciling.
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

interface FleetExpensesTableProps {
  rows: Transaction[];
  grouped: boolean;
  canEdit: boolean;
  onEdit: (row: Transaction) => void;
  onDelete: (row: Transaction) => void;
}

export function FleetExpensesTable({
  rows,
  grouped,
  canEdit,
  onEdit,
  onDelete,
}: FleetExpensesTableProps) {
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
              className="flex w-full items-center justify-between bg-muted/50 px-4 py-2 text-sm hover:bg-muted"
            >
              <span className="flex items-center gap-2 font-medium">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    collapsed[group.key] && '-rotate-90',
                  )}
                />
                {group.label}
                <span className="text-muted-foreground">({group.rows.length})</span>
              </span>
              <span className="font-semibold tabular-nums">{formatCurrency(group.total)}</span>
            </button>
          )}

          {!collapsed[group.key] && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th className="text-start">Date</Th>
                    <Th className="text-start">Description</Th>
                    <Th className="text-start">Type</Th>
                    <Th className="text-start">Vehicle</Th>
                    <Th className="text-start">Company</Th>
                    <Th className="text-start">Method</Th>
                    <Th className="text-start">Source</Th>
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
                      <Td className="max-w-[22rem]">
                        <div className="truncate">
                          {row.description || row.counterparty || '—'}
                        </div>
                        {row.reference && (
                          <div className="truncate text-xs text-muted-foreground">
                            {row.reference}
                          </div>
                        )}
                      </Td>
                      <Td>{row.category || '—'}</Td>
                      <Td className="whitespace-nowrap">{row.car_no_plate || '—'}</Td>
                      <Td className="whitespace-nowrap">{row.company || '—'}</Td>
                      <Td className="whitespace-nowrap">{row.payment_method || '—'}</Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <SourceBadge source={row.source} />
                          {row.has_overrides && <EditedIndicator row={row} />}
                          {row.verified && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-end font-medium tabular-nums">
                        <AmountCell row={row} />
                      </Td>
                      {canEdit && (
                        <Td className="text-end">
                          <div className="flex justify-end gap-1">
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
                          </div>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Shows the effective amount, and the fee split when the bank reported a
 * fee-inclusive figure. The split is derived server-side, never stored — some
 * banks bundle the 0.1% IPN fee into the amount and others deduct it separately.
 */
function AmountCell({ row }: { row: Transaction }) {
  const hasFee = (row.fee ?? 0) > 0;
  if (!hasFee) return <>{formatCurrency(row.amount ?? 0)}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/50">
          {formatCurrency(row.amount ?? 0)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>Principal: {formatCurrency(row.principal ?? 0)}</div>
          <div>IPN fee (0.1%): {formatCurrency(row.fee ?? 0)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * A corrected row keeps the SMS's original reading. Surfacing it matters: it is
 * the difference between "the bank said this" and "someone typed this".
 */
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
          {original.amount != null && <div>Amount: {formatCurrency(original.amount)}</div>}
          {original.counterparty && <div>Counterparty: {original.counterparty}</div>}
          {original.occurred_at && <div>Date: {fmtDate(original.occurred_at)}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('px-3 py-2 font-medium', className)}>{children}</th>;
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2', className)}>{children}</td>;
}
