import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, EyeOff, Inbox, X } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatMoney } from '@/shared/lib/money';
import { formatCairoDateTime } from '@/shared/lib/cairo';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import {
  useDeleteTransaction,
  useTransactionsPaged,
  useUpdateTransaction,
} from '@/entities/transaction/queries';
import type { Transaction, TransactionFilters } from '@/entities/transaction/schemas';

/* -------------------------------------------------------------------------- */
/* Cash in — needs review                                                      */
/*                                                                            */
/* Incoming transfers are not spending, so they never enter the ledger or the  */
/* analytics. They land in this pocket instead, and each one gets exactly one  */
/* of two verdicts: "it was cash out" (PATCH direction:'out' with If-Match —   */
/* the row then appears in the ledger normally) or "ignore" (soft DELETE with  */
/* If-Match, behind a small confirm). Both mutations invalidate the            */
/* transactions key, so the amber badge and the ledger refresh on their own.   */
/*                                                                            */
/* Presentation: full-width bottom sheet on phones, an inline section on       */
/* desktop. The list itself only fetches once the pocket is opened.            */
/* -------------------------------------------------------------------------- */

interface CashInReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The page's base filters — direction is overridden to 'in' here. */
  filters: TransactionFilters;
  canEdit: boolean;
}

export function CashInReview({ open, onOpenChange, filters, canEdit }: CashInReviewProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  const inFilters = React.useMemo(
    () => ({ ...filters, direction: 'in' as const }),
    [filters],
  );
  const query = useTransactionsPaged(inFilters, open);

  const rows = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  const body = (
    <div className="space-y-2.5">
      {query.isLoading ? (
        <>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t('fleetExpenses.cashIn.empty')}</p>
          <p className="text-xs text-muted-foreground">
            {t('fleetExpenses.cashIn.emptyHint')}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <CashInRow key={row.id} row={row} canEdit={canEdit} />
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 w-full"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
        </Button>
      )}
    </div>
  );

  const heading = (
    <div className="min-w-0">
      <h3 className="text-base font-semibold">{t('fleetExpenses.cashIn.title')}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t('fleetExpenses.cashIn.subtitle')}
      </p>
    </div>
  );

  if (isDesktop) {
    if (!open) return null;
    return (
      <section className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
        <div className="flex items-start justify-between gap-3">
          {heading}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {body}
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="space-y-3">
          {heading}
          {body}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* One incoming transfer                                                       */
/* -------------------------------------------------------------------------- */

function CashInRow({ row, canEdit }: { row: Transaction; canEdit: boolean }) {
  const { t, i18n } = useTranslation();
  const update = useUpdateTransaction();
  const del = useDeleteTransaction();
  const [confirmIgnore, setConfirmIgnore] = React.useState(false);

  const busy = update.isPending || del.isPending;
  // The verbatim-ish summary: the parsed description, minus a duplicated
  // counterparty line, plus the bank reference when there is one. When there
  // is no counterparty the title line already shows the description.
  const summary =
    row.counterparty && row.description && row.description !== row.counterparty
      ? row.description
      : null;

  return (
    <li className="space-y-2.5 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium [overflow-wrap:anywhere]" dir="auto">
            {row.counterparty || row.description || '—'}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {formatCairoDateTime(row.occurred_at, i18n.language)}
          </p>
        </div>
        <span
          dir="ltr"
          className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
        >
          + {formatMoney(row.amount)}
          {row.currency && row.currency !== 'EGP' ? ` ${row.currency}` : ''}
        </span>
      </div>

      {(summary || row.reference) && (
        <p
          className="text-xs text-muted-foreground [overflow-wrap:anywhere]"
          dir="auto"
        >
          {summary}
          {summary && row.reference ? ' · ' : ''}
          {row.reference && <span className="font-mono">{row.reference}</span>}
        </p>
      )}

      {canEdit && row.editable && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 sm:min-h-8"
            disabled={busy}
            onClick={() =>
              update.mutate({
                id: row.id,
                version: row.version,
                values: { direction: 'out' },
              })
            }
          >
            <ArrowRightLeft className="h-4 w-4" />
            {t('fleetExpenses.cashIn.markOut')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 flex-1 text-muted-foreground sm:min-h-8 sm:flex-none"
            disabled={busy}
            onClick={() => setConfirmIgnore(true)}
          >
            <EyeOff className="h-4 w-4" />
            {t('fleetExpenses.cashIn.ignore')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmIgnore}
        onOpenChange={setConfirmIgnore}
        stacked
        title={t('fleetExpenses.cashIn.ignoreConfirmTitle')}
        description={t('fleetExpenses.cashIn.ignoreConfirmDescription', {
          amount: `${formatMoney(row.amount)} ${row.currency ?? 'EGP'}`,
        })}
        confirmLabel={t('fleetExpenses.cashIn.ignoreConfirm')}
        variant="destructive"
        loading={del.isPending}
        onConfirm={() => {
          del.mutate(
            { id: row.id, version: row.version },
            {
              onSuccess: () => setConfirmIgnore(false),
              onError: () => setConfirmIgnore(false),
            },
          );
        }}
      />
    </li>
  );
}
