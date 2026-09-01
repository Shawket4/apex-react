import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { flattenPile, type Pile } from '@/entities/receipt-pile/schemas';

interface Props {
  piles: Pile[];
}

/**
 * The boxes themselves: one panel per box, the drop-off names inside it in
 * alphabetical order.
 *
 * The letter is shown once per run rather than on every row — it is the box's
 * organising key, not a per-row attribute, and repeating it down the column
 * turns the one thing the filer scans for into noise.
 */
export function ReceiptPilesBoxes({ piles }: Props) {
  return (
    // items-start: a box with six names should not be stretched to the height
    // of one with twenty just because they share a row.
    <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {piles.map((pile) => (
        <PileBox key={pile.index} pile={pile} />
      ))}
    </div>
  );
}

function PileBox({ pile }: { pile: Pile }) {
  const { t } = useTranslation();
  const rows = flattenPile(pile);

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <h3 className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('receiptPiles.box', { n: pile.index })}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-base font-semibold tracking-[0.2em] text-foreground"
          title={pile.label}
        >
          {pile.label}
        </span>
        <span className="shrink-0 text-end text-[10px] leading-tight text-muted-foreground tabular-nums">
          {t('receiptPiles.receiptCount', { count: pile.receipt_count })}
          <br />
          {t('receiptPiles.pointCount', { count: pile.drop_off_count })}
        </span>
      </h3>

      <ul className="max-h-80 overflow-y-auto">
        {rows.map((row) => (
          <li
            key={`${row.letter}-${row.name}`}
            className="flex items-baseline gap-2 border-b border-border/50 px-3 py-1.5 last:border-b-0"
          >
            <span
              aria-hidden={!row.firstOfLetter}
              className={cn(
                'w-4 shrink-0 text-xs font-semibold text-muted-foreground',
                !row.firstOfLetter && 'invisible',
              )}
            >
              {row.letter}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]" title={row.name}>
              {row.name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {row.receipt_count}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
