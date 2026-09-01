import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import type { PilePlan } from '@/entities/receipt-pile/schemas';

interface Props {
  plan: PilePlan;
}

/**
 * How even the split is, in one strip.
 *
 * Bar width is receipt count, so whether a plan is worth printing reads at a
 * glance rather than by comparing numbers down a column. The floor line under
 * it is the part that answers the question everyone asks first: the boxes are
 * not equal and cannot be, because one letter can hold a seventh of the
 * month's paper and a letter is never split across boxes.
 */
export function ReceiptPilesBalance({ plan }: Props) {
  const { t } = useTranslation();
  const average = plan.total_receipts / Math.max(plan.piles.length, 1);

  const stats = [
    { key: 'boxes', value: plan.piles.length },
    { key: 'receipts', value: plan.total_receipts },
    { key: 'dropOffs', value: plan.total_drop_offs },
    // ltr: "79 / 37" is a Latin-numeral pair, and in an Arabic paragraph the
    // bidi algorithm reorders it to "37 / 79" — under a label reading
    // "الأثقل / الأخف" the screen was stating the exact opposite of the truth.
    { key: 'spread', value: `${plan.heaviest_pile} / ${plan.lightest_pile}`, ltr: true },
  ];

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <h2 className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('receiptPiles.balance.title')}
        <span className="font-medium normal-case tracking-normal">
          {t('receiptPiles.balance.average', { count: Math.round(average) })}
        </span>
      </h2>

      <div className="grid gap-3 p-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          {stats.map(({ key, value, ltr }) => (
            <div key={key} className="flex items-baseline gap-1.5">
              <dd className="text-sm font-semibold tabular-nums" dir={ltr ? 'ltr' : undefined}>
                {typeof value === 'number' ? formatNumber(value, 0) : value}
              </dd>
              <dt className="text-xs text-muted-foreground">
                {t(`receiptPiles.balance.${key}`)}
              </dt>
            </div>
          ))}
        </dl>

        <div className="flex h-12 gap-1">
          {plan.piles.map((pile) => {
            // Semantic, not decorative: warning means this box is the one that
            // will take longest, success means it is light enough to spare.
            const heavy = pile.receipt_count > average * 1.2;
            const light = pile.receipt_count < average * 0.8;
            return (
              <div
                key={pile.index}
                style={{ flex: Math.max(pile.receipt_count, 1) }}
                title={`${t('receiptPiles.box', { n: pile.index })} · ${pile.label} · ${pile.receipt_count}`}
                className={cn(
                  'grid min-w-0 place-items-center overflow-hidden rounded-md border text-center',
                  heavy && 'border-warning/40 bg-warning/10',
                  light && 'border-success/40 bg-success/10',
                  !heavy && !light && 'border-transparent bg-primary/10',
                )}
              >
                <span className="px-1">
                  <b className="block text-xs font-semibold tabular-nums">
                    {pile.receipt_count}
                  </b>
                  <small className="text-[10px] text-muted-foreground">{pile.index}</small>
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('receiptPiles.balance.floor', {
            letter: plan.floor_letter,
            count: plan.floor_weight,
          })}
          {plan.skipped_receipts > 0 && (
            <>
              {' · '}
              <span className="text-warning">
                {t('receiptPiles.balance.skipped', { count: plan.skipped_receipts })}
              </span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
