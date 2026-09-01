import { useTranslation } from 'react-i18next';
import type { Pile } from '@/entities/receipt-pile/schemas';

interface Props {
  piles: Pile[];
  onJump: (pileIndex: number) => void;
}

/**
 * Letter → box, on one screen.
 *
 * This is the answer the filer actually needs. The box a receipt goes in is
 * decided entirely by one Arabic letter — the 105 drop-off names below are
 * verification, not the lookup — so the phone opens on the mapping itself
 * rather than on a catalogue of what each box contains.
 *
 * Box-major, with the number leading, because the number is the answer. The
 * whole band is one tap target rather than one per letter: a mis-tap between
 * ب and ت inside a band still lands on the same box, so the index can never be
 * the control that files a receipt into the wrong place.
 *
 * A wrapped grid, deliberately NOT a ChipGroup: a sideways scroller is right
 * for an open-ended set of filters, and wrong for an alphabet. The alphabet is
 * complete, ordered and memorised, and its value here is seeing all of it at
 * once — hiding two thirds of it off-screen would make the filer swipe to hunt
 * for ه instead of just looking.
 */
export function ReceiptPilesLetterIndex({ piles, onJump }: Props) {
  const { t } = useTranslation();

  return (
    <section className="grid gap-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('receiptPiles.index.title')}
      </h2>

      <div className="grid gap-1.5">
        {piles.map((pile) => (
          <button
            key={pile.index}
            type="button"
            onClick={() => onJump(pile.index)}
            className="flex min-h-14 w-full items-center gap-3 rounded-lg border bg-card p-2 text-start transition-colors active:bg-accent [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-lg font-semibold tabular-nums text-primary">
              {pile.index}
            </span>
            {/* dir="rtl" orders the letters — in the LTR shell an unisolated
                run of Arabic letters lays out backwards. No flex-1, so the run
                sits against the box number rather than being pushed to the far
                edge of the band. */}
            <span dir="rtl" className="flex min-w-0 flex-wrap gap-1">
              {pile.letters.map((letter) => (
                <span
                  key={letter.letter}
                  className="grid h-9 min-w-9 place-items-center rounded-md border bg-muted/40 px-1 leading-none"
                >
                  <span className="text-base font-semibold">{letter.letter}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {letter.receipt_count}
                  </span>
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>

      {/* The one rule the whole scheme rests on, printed where it is used
          rather than left as folklore: العياط files under ع, not ا. */}
      <p className="text-xs text-muted-foreground">{t('receiptPiles.index.articleRule')}</p>
    </section>
  );
}
