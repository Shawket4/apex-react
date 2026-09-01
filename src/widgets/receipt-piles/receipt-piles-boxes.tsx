import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { flattenPile, type Pile } from '@/entities/receipt-pile/schemas';
import type { IntentHandlers } from '@/shared/lib/prefetch';

interface Props {
  piles: Pile[];
  /** Opens the drop-off's per-terminal tables. */
  onSelectDropOff: (name: string) => void;
  /** Hover/focus warming for the call that click will make. */
  intentFor: (name: string) => IntentHandlers;
}

/**
 * The boxes themselves: one panel per box, the drop-off names inside it in
 * alphabetical order.
 *
 * The letter is shown once per run rather than on every row — it is the box's
 * organising key, not a per-row attribute, and repeating it down the column
 * turns the one thing the filer scans for into noise.
 */
export function ReceiptPilesBoxes({ piles, onSelectDropOff, intentFor }: Props) {
  return (
    // items-start: a box with six names should not be stretched to the height
    // of one with twenty just because they share a row.
    <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
      {piles.map((pile) => (
        <PileBox
          key={pile.index}
          pile={pile}
          onSelectDropOff={onSelectDropOff}
          intentFor={intentFor}
        />
      ))}
    </div>
  );
}

function PileBox({
  pile,
  onSelectDropOff,
  intentFor,
}: {
  pile: Pile;
  onSelectDropOff: (name: string) => void;
  intentFor: (name: string) => IntentHandlers;
}) {
  const { t } = useTranslation();
  const rows = flattenPile(pile);

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <h3 className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('receiptPiles.box', { n: pile.index })}
        </span>
        {/* dir="auto": the label is a run of Arabic letters, and left to the
            LTR shell the bidi algorithm reverses it — "ج ح خ" rendered as
            "خ ح ج", i.e. the box's own alphabetical range backwards.
            No letter-spacing either: it is a shaping control for Latin, and on
            Arabic it pulls glyphs away from their joins. */}
        <span
          className="min-w-0 flex-1 truncate text-base font-semibold text-foreground"
          title={pile.label}
        >
          <bdi>{pile.label}</bdi>
        </span>
        <span className="shrink-0 text-end text-[10px] leading-tight text-muted-foreground tabular-nums">
          {t('receiptPiles.receiptCount', { count: pile.receipt_count })}
          <br />
          {t('receiptPiles.pointCount', { count: pile.drop_off_count })}
        </span>
      </h3>

      <ul className="max-h-80 overflow-y-auto">
        {rows.map((row) => (
          <li key={`${row.letter}-${row.name}`} className="border-b border-border/50 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelectDropOff(row.name)}
              {...intentFor(row.name)}
              // 44px tall: this is the primary action on the card and these
              // rows sit directly on top of one another.
              className="flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-start transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {/* The non-alphabetic buckets ("أرقام", "لاتيني", "غير مسجل")
                  are words, not glyphs, and wrapped out of a fixed 16px box
                  onto the drop-off name. */}
              <span
                aria-hidden={!row.firstOfLetter}
                className={cn(
                  'min-w-4 max-w-16 shrink-0 truncate text-xs font-semibold text-muted-foreground',
                  !row.firstOfLetter && 'invisible',
                )}
              >
                {row.letter}
              </span>
              {/* dir="auto" so an Arabic name truncates at its tail rather
                  than its head — the head is the part being matched against
                  the paper in hand. */}
              <span className="min-w-0 flex-1 truncate text-[13px]" title={row.name}>
                <bdi>{row.name}</bdi>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {row.receipt_count}
              </span>
              {/* rtl:rotate-180 so the chevron points out of the row, not into
                  it, when the page flips to Arabic. */}
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
