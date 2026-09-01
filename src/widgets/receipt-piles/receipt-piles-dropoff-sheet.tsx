import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { extractErrorMessage } from '@/shared/api/errors';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import { useDropOffDetail } from '@/entities/receipt-pile/queries';
import type { DropOffTerminal, ReceiptStatus } from '@/entities/receipt-pile/schemas';

/* -------------------------------------------------------------------------- */
/* One drop-off's receipts, exactly as the fee report prints them              */
/*                                                                            */
/* The whole point of this panel is that it is the same document: someone      */
/* holding the stack for حلوان 1 works down these tables and finds the sheets  */
/* in this order, and a clerk checking the workbook sees the same tables in    */
/* the same order with the same totals.                                       */
/*                                                                            */
/* So NOTHING here re-orders anything. The server returns terminals in the     */
/* report's byte-order sort and receipts by date then receipt number, and this */
/* renders that sequence as it arrives. No sortable columns either — a click   */
/* that reorders the table would silently break the guarantee the panel is     */
/* for.                                                                       */
/* -------------------------------------------------------------------------- */

interface Props {
  /** The drop-off being inspected; null closes the sheet. */
  dropOffPoint: string | null;
  startDate: string;
  endDate: string;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptPilesDropOffSheet({
  dropOffPoint,
  startDate,
  endDate,
  onOpenChange,
}: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const detail = useDropOffDetail(
    dropOffPoint ? { startDate, endDate, dropOffPoint } : null,
  );

  return (
    <Sheet open={dropOffPoint !== null} onOpenChange={onOpenChange}>
      <SheetContent
        // Bottom on a phone: every successful lookup lands here, and a
        // side panel dismissed by a 16px X in the far top corner is the wrong
        // shape for someone holding paper in the other hand.
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'overflow-y-auto overscroll-contain p-0',
          // The bottom variant carries no height of its own. The padding is
          // the house pattern: viewport-fit=cover means bottom-0 is the
          // physical edge, so without it the totals row renders under the
          // home indicator, where a drag is taken by the iOS home gesture
          // rather than the sheet.
          isMobile
            ? 'max-h-[85dvh] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]'
            : 'w-full sm:max-w-2xl',
        )}
      >
        {/* pe-10 clears the close button in the corner; without it an Arabic
            drop-off name runs straight underneath it. */}
        <SheetHeader className="border-b bg-muted/40 p-4 pe-12 text-start">
          <SheetTitle className="text-base">
            {/* dir="auto" on the span, not the heading: it isolates the name's
                bidi run without flipping the heading's alignment to the far
                edge, which put it back under the close button. */}
            <span dir="auto">{dropOffPoint}</span>
          </SheetTitle>
          {detail.data && (
            <p className="text-xs text-muted-foreground">
              {t('receiptPiles.detail.receiptsAcross', {
                count: detail.data.terminals.length,
                receipts: detail.data.receipt_count,
              })}
              {' · '}
              <span dir="ltr">{formatNumber(detail.data.total_capacity, 0)} L</span>
            </p>
          )}
        </SheetHeader>

        <div className="grid gap-4 p-4">
          {detail.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <span className="min-w-0">
                {extractErrorMessage(detail.error, t('receiptPiles.detail.failed'))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void detail.refetch()}
                className="ms-auto h-7 shrink-0 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"
              >
                <RefreshCw aria-hidden />
                {t('common.retry')}
              </Button>
            </div>
          )}

          {detail.isPending && dropOffPoint !== null && (
            <>
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </>
          )}

          {detail.data?.unmapped_receipts ? (
            <p className="rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2 text-[12.5px]">
              {t('receiptPiles.detail.unmappedNote', {
                count: detail.data.unmapped_receipts,
              })}
            </p>
          ) : null}

          {detail.data?.terminals.map((terminal) => (
            <TerminalTable key={terminal.terminal} terminal={terminal} />
          ))}

          {detail.data && detail.data.terminals.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t('receiptPiles.detail.empty')}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** One terminal's table — the report's table, column for column. */
function TerminalTable({ terminal }: { terminal: DropOffTerminal }) {
  const { t } = useTranslation();
  // Driven by what the server sent, not by re-reading the permission here:
  // it withholds the money fields entirely below the financial level, and a
  // second copy of that rule on the client is a second thing to get wrong.
  // Note `!= null` rather than a truthiness test — 0 is a real fee.
  const showMoney = terminal.actual_fee != null;

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header
        className={cn(
          'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-3 py-2',
          terminal.unmapped ? 'bg-warning/10' : 'bg-muted/60',
        )}
      >
        <h3 className="text-sm font-semibold" dir="auto">
          {terminal.terminal}
        </h3>
        {terminal.unmapped ? (
          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
            {t('receiptPiles.detail.unmapped')}
          </span>
        ) : (
          // Only the Latin fragments are isolated. dir="ltr" on the whole line
          // scrambled it for Arabic, where the band label reads "الفئة 2".
          //
          // The band NUMBER always shows: it says which tariff row applies,
          // not what anyone is paid. The rate it converts to is money and is
          // absent from the payload below the financial permission.
          <span className="text-[11px] text-muted-foreground">
            {t('receiptPiles.detail.band', { n: terminal.fee_index })}
            {terminal.actual_fee != null && (
              <>
                {' · '}
                <span dir="ltr">{formatNumber(terminal.actual_fee, 1)}</span>
              </>
            )}
            {' · '}
            <span dir="ltr">{formatNumber(terminal.distance, 0)} km</span>
          </span>
        )}
        <span className="ms-auto flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
          {/* Where the paper is, at a glance, so a terminal that still has
              sheets outstanding is visible without reading its rows. */}
          {terminal.not_filed > 0 && (
            <span className="rounded-full border border-warning/40 px-1.5 py-0.5 text-[10px] font-medium leading-none text-warning">
              {terminal.not_filed}
            </span>
          )}
          {t('receiptPiles.receiptCount', { count: terminal.receipt_count })}
        </span>
      </header>

      {/* From md up, the report's table verbatim. It scrolls inside its own
          box so the sheet never scrolls sideways. Below md it is replaced
          rather than squeezed: a 544px table inside a 390px bottom sheet is
          three nested scroll contexts, which is the defect this whole pass
          removes from the rest of the screen. */}
      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full min-w-[34rem] text-xs">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-2 py-1.5 text-start font-semibold">#</th>
              <th className="px-2 py-1.5 text-start font-semibold">
                {t('receiptPiles.detail.date')}
              </th>
              <th className="px-2 py-1.5 text-start font-semibold">
                {t('receiptPiles.detail.receipt')}
              </th>
              <th className="px-2 py-1.5 text-start font-semibold">
                {t('receiptPiles.detail.driver')}
              </th>
              <th className="px-2 py-1.5 text-start font-semibold">
                {t('receiptPiles.detail.plate')}
              </th>
              <th className="px-2 py-1.5 text-end font-semibold">
                {t('receiptPiles.detail.capacity')}
              </th>
              <th className="px-2 py-1.5 text-start font-semibold">
                {t('receiptPiles.detail.status')}
              </th>
              {showMoney && (
                <th className="px-2 py-1.5 text-end font-semibold">
                  {t('receiptPiles.detail.cost')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {terminal.receipts.map((receipt) => (
              <tr key={receipt.receipt_no} className="border-b border-border/50 last:border-b-0">
                <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{receipt.seq}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums" dir="ltr">
                  {receipt.date}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 font-medium tabular-nums" dir="ltr">
                  {receipt.receipt_no}
                </td>
                <td className="max-w-[9rem] truncate px-2 py-1.5" dir="auto">
                  {receipt.driver_name || '—'}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5" dir="auto">
                  {receipt.car_no_plate || '—'}
                </td>
                <td className="px-2 py-1.5 text-end tabular-nums">
                  {formatNumber(receipt.tank_capacity, 0)}
                </td>
                <td className="px-2 py-1.5">
                  <ReceiptStatusFlag status={receipt.status} />
                </td>
                {showMoney && (
                  <td className="px-2 py-1.5 text-end tabular-nums">
                    {formatNumber(receipt.cost, 2)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="px-2 py-1.5" colSpan={5}>
                {t('receiptPiles.detail.total')}
              </td>
              <td className="px-2 py-1.5 text-end tabular-nums">
                {formatNumber(terminal.total_capacity, 0)}
              </td>
              <td />
              {showMoney && (
                <td className="px-2 py-1.5 text-end tabular-nums">
                  {formatNumber(terminal.total_cost, 2)}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Same array, same order, unsorted and unsortable — the Excel-parity
          guarantee is about sequence, not column geometry. */}
      <ul className="divide-y md:hidden">
        {terminal.receipts.map((receipt) => (
          <li key={receipt.receipt_no} className="px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                {receipt.seq}
              </span>
              {/* dir on the inner text, not on the flex-1 box: setting it on
                  the growing box pushed the receipt number to the far edge in
                  Arabic and left the sequence number floating alone. */}
              <span className="flex-1 font-mono text-sm font-medium tabular-nums">
                <bdi>{receipt.receipt_no}</bdi>
              </span>
              <span dir="ltr" className="text-xs tabular-nums text-muted-foreground">
                {receipt.date}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ps-8 text-[11px] text-muted-foreground">
              <span dir="auto" className="min-w-0 truncate">
                {receipt.driver_name || '—'}
              </span>
              <span dir="auto">{receipt.car_no_plate || '—'}</span>
              <ReceiptStatusFlag status={receipt.status} />
              <span className="ms-auto tabular-nums">
                {formatNumber(receipt.tank_capacity, 0)} L
              </span>
              {showMoney && (
                <span className="tabular-nums text-foreground">
                  {formatNumber(receipt.cost, 2)}
                </span>
              )}
            </div>
          </li>
        ))}
        <li className="flex flex-wrap items-baseline gap-x-3 border-t-2 bg-muted/40 px-3 py-2 text-xs font-semibold">
          <span>{t('receiptPiles.detail.total')}</span>
          <span className="ms-auto tabular-nums">
            {formatNumber(terminal.total_capacity, 0)} L
          </span>
          {showMoney && (
            <span className="tabular-nums">{formatNumber(terminal.total_cost, 2)}</span>
          )}
        </li>
      </ul>
    </section>
  );
}

/**
 * Where this receipt's paper currently is, from its most recent step.
 *
 * Three states, and "none" is the one worth spotting: it means the sheet has
 * never been logged anywhere, so it is the one somebody has to go and find.
 * Colour carries that — a tint for the two settled states, a warning outline
 * for the one that needs a person.
 */
function ReceiptStatusFlag({ status }: { status: ReceiptStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
        status === 'office' && 'bg-success/15 text-success',
        status === 'garage' && 'bg-primary/10 text-primary',
        status === 'none' && 'border border-warning/40 text-warning',
      )}
    >
      {t(`receiptPiles.detail.status_${status}`)}
    </span>
  );
}
