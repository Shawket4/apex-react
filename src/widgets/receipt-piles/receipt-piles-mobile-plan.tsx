import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

import { EmptyState } from '@/shared/ui/empty-state';
import { SearchInput } from '@/shared/ui/search-input';
import { cn } from '@/shared/lib/cn';
import { matches, normalize } from '@/shared/lib/normalize';
import { useDebounce } from '@/shared/hooks/use-debounce';
import type { IntentHandlers } from '@/shared/lib/prefetch';
import { flattenPlan, type PilePlan, type PlanRow } from '@/entities/receipt-pile/schemas';
import { ReceiptPilesLetterIndex } from './receipt-piles-letter-index';

/* -------------------------------------------------------------------------- */
/* The plan on a phone                                                         */
/*                                                                            */
/* The desktop grid answers "what is in box 4?". Standing at a table with a    */
/* sheet of paper in one hand, the question is the other way round: "which box */
/* does this name go in?" — so the phone opens on a finder and a letter index, */
/* and the boxes themselves are below as verification.                        */
/*                                                                            */
/* Three rules this file exists to keep:                                       */
/*                                                                            */
/*   No nested scroll. The desktop card clamps its list to max-h-80, and with  */
/*   runs of 6/8/17/11/12/20/14/8/9 that trapped eight of nine boxes in their  */
/*   own scroller — a swipe over a card scrolled the card, and five drop-offs  */
/*   in box 5 were unreachable with no affordance saying so. Nothing in this   */
/*   tree sets an overflow or a max height; the page owns every gesture.       */
/*                                                                            */
/*   No overflow-hidden on the sections either. It would make each section the */
/*   nearest scrollport, and the sticky header inside it would pin to a box    */
/*   that never scrolls — silently doing nothing.                             */
/*                                                                            */
/*   The server owns the plan. This filters and flattens what it sent; it      */
/*   never re-derives a letter, a box, or the balancing.                      */
/* -------------------------------------------------------------------------- */

interface Props {
  plan: PilePlan;
  /** Shown in the no-results copy, so "not found" can be told from "not in range". */
  rangeLabel: string;
  onSelectDropOff: (name: string) => void;
  intentFor: (name: string) => IntentHandlers;
  /** Mode + box-count controls, rendered under the finder. */
  controls: React.ReactNode;
}

/** Fixed height of the finder bar, and therefore the sticky offset below it. */
const FINDER_H = 'h-14';
const STICKY_UNDER_FINDER = 'top-14';

export function ReceiptPilesMobilePlan({
  plan,
  rangeLabel,
  onSelectDropOff,
  intentFor,
  controls,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const debounced = useDebounce(query, 200);

  // Keyed on the plan object: keepPreviousData hands back a new identity on
  // every re-split, and the params are not in scope here anyway.
  const rows = React.useMemo(() => flattenPlan(plan), [plan]);

  const searching = debounced.trim().length > 0;
  const results = React.useMemo(() => {
    if (!searching) return [];
    const hits = rows.filter((r) => matches(r.name, debounced));
    // Prefix matches first — someone reading a name off a receipt types its
    // beginning. `normalize` already folds أ/إ/آ→ا, ة→ه, ى→ي and strips
    // tashkeel, and `matches` is substring-on-normalized, so typing عياط finds
    // العياط with no article rule of our own. There must not be one: stripping
    // ال here would be a second implementation of a server rule.
    const needle = normalize(debounced);
    const starts = hits.filter((r) => normalize(r.name).startsWith(needle));
    const rest = hits.filter((r) => !normalize(r.name).startsWith(needle));
    return [...starts, ...rest];
  }, [rows, debounced, searching]);

  const jumpToBox = (index: number) => {
    document.getElementById(`pile-${index}`)?.scrollIntoView({
      block: 'start',
      // 'auto', not 'smooth': a smooth scroll across four screens on a phone is
      // a second of the wrong content going past.
      behavior: 'auto',
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The finder is a fixed height so the box headers' sticky offset below
          it is a constant — an input's placeholder cannot wrap, so there is
          nothing to measure and no ResizeObserver to keep in step. */}
      <div
        className={cn(
          // -mx-4 md:-mx-6: useIsMobile is max-width:768 and Tailwind's md is
          // min-width:768, so at exactly 768px (iPad portrait) this tree
          // renders inside PageShell's md:p-6 and a 16px bleed leaves an 8px
          // gutter either side of every full-bleed band.
          '-mx-4 md:-mx-6 sticky top-0 z-20 flex items-center border-b bg-background/95 px-4 backdrop-blur',
          'supports-[backdrop-filter]:bg-background/80',
          FINDER_H,
        )}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('receiptPiles.find.placeholder')}
          className="w-full [&_input]:h-11"
        />
      </div>

      {searching ? (
        <SearchResults
          results={results}
          // The DEBOUNCED query: `query` is already cleared while the results
          // still describe the old one, so the empty state flashed
          // 'Nothing matching ""' on the way out.
          query={debounced}
          rangeLabel={rangeLabel}
          onSelectDropOff={onSelectDropOff}
          intentFor={intentFor}
        />
      ) : (
        <>
          {/* One row: the mode switch and the box stepper are set once a
              month, and two full-width rows of chrome above the index push the
              answer off the first screen. */}
          <div className="flex flex-wrap items-center gap-2">{controls}</div>
          <ReceiptPilesLetterIndex piles={plan.piles} onJump={jumpToBox} />
          <PlanSummary plan={plan} />
          <div className="-mx-4 md:-mx-6">
            {plan.piles.map((pile) => (
              <section
                key={pile.index}
                id={`pile-${pile.index}`}
                // scroll-mt-14 == FINDER_H. Only the finder overlays the top:
                // the box's own header is the first thing inside the section,
                // so it must LAND at the finder's bottom edge, not be cleared.
                // At scroll-mt-24 the jump stopped 40px short and the PREVIOUS
                // box's sticky header sat in the gap, naming the wrong box.
                className="scroll-mt-14"
              >
                <h3
                  className={cn(
                    'sticky z-10 flex min-h-9 items-center gap-2 border-y bg-muted/90 px-4 py-1.5',
                    'backdrop-blur supports-[backdrop-filter]:bg-muted/70',
                    STICKY_UNDER_FINDER,
                  )}
                >
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('receiptPiles.box', { n: pile.index })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    <bdi>{pile.label}</bdi>
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {t('receiptPiles.receiptCount', { count: pile.receipt_count })}
                  </span>
                </h3>

                <ul>
                  {pile.letters.flatMap((letter) =>
                    letter.drop_offs.map((drop, i) => (
                      <li key={`${letter.letter}-${drop.name}`}>
                        <DropOffRow
                          name={drop.name}
                          letter={i === 0 ? letter.letter : null}
                          count={drop.receipt_count}
                          onSelect={onSelectDropOff}
                          intentFor={intentFor}
                        />
                      </li>
                    )),
                  )}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SearchResults({
  results,
  query,
  rangeLabel,
  onSelectDropOff,
  intentFor,
}: {
  results: PlanRow[];
  query: string;
  rangeLabel: string;
  onSelectDropOff: (name: string) => void;
  intentFor: (name: string) => IntentHandlers;
}) {
  const { t } = useTranslation();

  if (results.length === 0) {
    return (
      <EmptyState
        title={t('receiptPiles.find.emptyTitle', { query })}
        // Names the range, because to someone holding a real sheet of paper a
        // name outside the dates is otherwise indistinguishable from a typo.
        // U+2066 LRI … U+2069 PDI: the range is English month names and Latin
        // numerals, and dropped raw into the Arabic sentence the bidi
        // algorithm renders "1 Jul – 31 Jul 2026" as "Jul – 31 Jul 2026 1" —
        // in the one sentence whose job is to tell "not found" from "outside
        // these dates".
        description={t('receiptPiles.find.emptyDescription', {
          range: `\u2066${rangeLabel}\u2069`,
        })}
      />
    );
  }

  return (
    <div className="-mx-4 md:-mx-6">
      <p
        role="status"
        aria-live="polite"
        className="px-4 py-1 text-[11px] text-muted-foreground"
      >
        {t('receiptPiles.find.results', { count: results.length })}
      </p>
      <ul className="divide-y">
        {results.map((row) => (
          <li key={`${row.pileIndex}-${row.name}`}>
            <button
              type="button"
              onClick={() => onSelectDropOff(row.name)}
              {...intentFor(row.name)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start transition-colors active:bg-accent [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {/* The box number leads: the name is the question, this is the
                  answer, and it should be the first thing the eye lands on. */}
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-base font-semibold tabular-nums text-primary">
                {row.pileIndex}
              </span>
              <span className="min-w-0 flex-1">
                {/* No truncate: on the results surface the whole name is the
                    thing being verified against the paper. */}
                {/* <bdi>, not dir="auto": both isolate the Arabic run so it
                    orders correctly, but dir="auto" also sets direction:rtl on
                    the element, which right-aligns the name away from the box
                    number in the English UI. <bdi> is an inline isolate — the
                    ordering is the content's, the alignment stays the page's. */}
                <span className="block text-[15px]">
                  <bdi>{row.name}</bdi>
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  <bdi>{row.letter}</bdi>
                  {/* A one-letter box's label IS the letter, and "ع · ع · 12"
                      reads as a mistake. Per-letter mode makes every box that
                      shape. */}
                  {row.pileLabel !== row.letter && (
                    <>
                      {' · '}
                      <bdi>{row.pileLabel}</bdi>
                    </>
                  )}
                  {' · '}
                  <span className="tabular-nums">{row.receipt_count}</span>
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground/60 rtl:rotate-180"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DropOffRow({
  name,
  letter,
  count,
  onSelect,
  intentFor,
}: {
  name: string;
  letter: string | null;
  count: number;
  onSelect: (name: string) => void;
  intentFor: (name: string) => IntentHandlers;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      {...intentFor(name)}
      className="flex min-h-12 w-full items-center gap-3 border-b border-border/50 px-4 py-1.5 text-start transition-colors active:bg-accent [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {/* The letter is the box's organising key, not a per-row attribute, so
          it shows once per run — repeating it turns the one thing the eye
          scans for into noise. */}
      {/* `letter` is not always one glyph: the non-alphabetic buckets are
          "أرقام", "لاتيني" and "غير مسجل" (services/ReceiptPiles.go), and in a
          fixed 16px box those wrapped and painted over the drop-off name. */}
      <span
        aria-hidden={letter === null}
        className={cn(
          'min-w-4 max-w-16 shrink-0 truncate text-sm font-semibold text-muted-foreground',
          letter === null && 'invisible',
        )}
      >
        {letter ?? '·'}
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px]">
        <bdi>{name}</bdi>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/60 rtl:rotate-180"
        aria-hidden
      />
    </button>
  );
}

/**
 * The numbers, without the bar chart.
 *
 * The desktop strip's proportional bars are 21-43px wide on a phone, which is
 * too narrow to compare and too narrow to label — and the letter index above
 * already carries per-box counts. What survives is the figures and the floor
 * sentence, which is the screen's only answer to "why is box 6 twice the size
 * of box 3" and is asked by the person at the table, not the planner at a desk.
 */
function PlanSummary({ plan }: { plan: PilePlan }) {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <span>
          <b className="font-semibold text-foreground tabular-nums">{plan.piles.length}</b>{' '}
          {t('receiptPiles.balance.boxes')}
        </span>
        <span>
          <b className="font-semibold text-foreground tabular-nums">{plan.total_receipts}</b>{' '}
          {t('receiptPiles.balance.receipts')}
        </span>
        <span>
          <b className="font-semibold text-foreground tabular-nums">{plan.total_drop_offs}</b>{' '}
          {t('receiptPiles.balance.dropOffs')}
        </span>
        <span>
          {/* dir="ltr": in Arabic the bidi algorithm reorders "79 / 37" to
              "37 / 79", which reads as the opposite of what it says. */}
          <b dir="ltr" className="font-semibold text-foreground tabular-nums">
            {plan.heaviest_pile} / {plan.lightest_pile}
          </b>{' '}
          {t('receiptPiles.balance.spread')}
        </span>
      </p>
      <p className="mt-2">
        {t('receiptPiles.balance.floor', {
          letter: plan.floor_letter,
          count: plan.floor_weight,
        })}
      </p>
      {plan.skipped_receipts > 0 && (
        <p className="mt-1 text-warning">
          {t('receiptPiles.balance.skipped', { count: plan.skipped_receipts })}
        </p>
      )}
    </section>
  );
}
