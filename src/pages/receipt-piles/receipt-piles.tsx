import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { saveAs } from 'file-saver';
import { AlertCircle, Boxes, Download, Minus, Plus, RotateCcw } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { PageShell } from '@/shared/ui/page-shell';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { EmptyState } from '@/shared/ui/empty-state';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage } from '@/shared/api/errors';
import { cn } from '@/shared/lib/cn';
import { localDateISO, localToday } from '@/shared/lib/format';
import { intentProps } from '@/shared/lib/prefetch';

import {
  prefetchReceiptPilePlan,
  useExportReceiptPiles,
  useReceiptPilePlan,
} from '@/entities/receipt-pile/queries';
import type { PileMode, PilePlanParams } from '@/entities/receipt-pile/schemas';

/**
 * Receipt piles — the filing plan for a range of returned Watanya paper.
 *
 * The screen answers one question: which physical boxes do I need, and what
 * goes in each. Everything on it is computed by the backend (see
 * `services/ReceiptPiles.go`); this component owns the range, the mode and the
 * box count, and nothing else. The export button sends the same parameters to
 * the same endpoint's `/export`, so the workbook is always the plan on screen.
 *
 * Watanya-only, deliberately — there is no company filter, and there should not
 * be one. The letter rules are Arabic-specific and no other customer's receipts
 * come back as a heap to be sorted this way.
 */

/** Matches services.MaxPiles — beyond one box per letter, boxes are empty. */
const MAX_PILES = 31;

/** Fresh page opens on the previous whole month, which is what gets filed. */
function lastMonthRange(): { from: string; to: string } {
  const today = localToday();
  const firstOfThis = new Date(today.y, today.m, 1);
  const lastOfPrev = new Date(firstOfThis.getTime() - 86_400_000);
  return {
    from: localDateISO(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), 1),
    to: localDateISO(lastOfPrev.getFullYear(), lastOfPrev.getMonth(), lastOfPrev.getDate()),
  };
}

export function ReceiptPilesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const initial = React.useMemo(lastMonthRange, []);
  const [from, setFrom] = React.useState<string>(initial.from);
  const [to, setTo] = React.useState<string>(initial.to);
  const [mode, setMode] = React.useState<PileMode>('balanced');
  /** null = let the server choose from the range. */
  const [piles, setPiles] = React.useState<number | null>(null);

  const params: PilePlanParams = React.useMemo(
    () => ({
      startDate: from,
      endDate: to,
      mode,
      ...(mode === 'balanced' && piles ? { piles } : {}),
    }),
    [from, to, mode, piles],
  );

  const { data: plan, isLoading, isFetching, isError, error, refetch } =
    useReceiptPilePlan(params);
  const exportPiles = useExportReceiptPiles();

  // The server may return fewer boxes than asked — it drops boxes that cannot
  // make the heaviest box lighter. Step from what came back, not from what was
  // requested, or the first click after an auto plan jumps.
  const shownPiles = plan?.piles.length ?? 0;

  const stepTo = (next: number) => setPiles(Math.min(MAX_PILES, Math.max(1, next)));

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportPiles.mutateAsync(params);
      saveAs(blob, filename);
      toast.success(t('receiptPiles.export.success'));
    } catch (err) {
      toast.error(extractErrorMessage(err, t('receiptPiles.export.failed')));
    }
  };

  /* ------------------------------------------------------------------------ */

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex overflow-hidden rounded-lg border"
        role="group"
        aria-label={t('receiptPiles.mode.label')}
      >
        {(['balanced', 'letter'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            {...intentProps(() => prefetchReceiptPilePlan(qc, { ...params, mode: m }))}
            className={cn(
              'px-3 py-1.5 text-sm transition-colors',
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`receiptPiles.mode.${m}`)}
          </button>
        ))}
      </div>

      {mode === 'balanced' && (
        <div className="inline-flex items-center gap-1 rounded-lg border px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('receiptPiles.fewerBoxes')}
            disabled={shownPiles <= 1}
            onClick={() => stepTo(shownPiles - 1)}
            {...intentProps(() =>
              prefetchReceiptPilePlan(qc, { ...params, piles: Math.max(1, shownPiles - 1) }),
            )}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums">
            {shownPiles || '—'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('receiptPiles.moreBoxes')}
            disabled={shownPiles >= MAX_PILES}
            onClick={() => stepTo(shownPiles + 1)}
            {...intentProps(() =>
              prefetchReceiptPilePlan(qc, {
                ...params,
                piles: Math.min(MAX_PILES, shownPiles + 1),
              }),
            )}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {piles !== null && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t('receiptPiles.auto')}
              onClick={() => setPiles(null)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <Button
        onClick={handleExport}
        disabled={exportPiles.isPending || !plan || plan.piles.length === 0}
      >
        <Download className="me-2 h-4 w-4" />
        {exportPiles.isPending ? t('receiptPiles.export.working') : t('receiptPiles.export.action')}
      </Button>
    </div>
  );

  return (
    <PageShell
      title={t('receiptPiles.title')}
      description={t('receiptPiles.description')}
      icon={<Boxes className="h-5 w-5" />}
      actions={toolbar}
    >
      <DateRangePicker
        from={from}
        to={to}
        onChange={(f, tt) => {
          if (f) setFrom(f);
          if (tt) setTo(tt);
        }}
      />

      {isError && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {extractErrorMessage(error, t('receiptPiles.loadFailed'))}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      )}

      {plan && plan.piles.length === 0 && !isLoading && (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title={t('receiptPiles.empty.title')}
          description={t('receiptPiles.empty.description')}
        />
      )}

      {plan && plan.piles.length > 0 && (
        <div className={cn('grid gap-4', isFetching && 'opacity-60 transition-opacity')}>
          <BalanceStrip plan={plan} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plan.piles.map((pile) => (
              <PileCard key={pile.index} pile={pile} />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/* The balance strip                                                           */
/*                                                                            */
/* Bar width is receipt count, so whether a split is worth printing reads at   */
/* a glance. The floor line is the part that stops the "why aren't these even" */
/* question: one letter can hold a seventh of the month, and a letter is never */
/* split, so that letter's weight is the lightest any box can be.              */
/* -------------------------------------------------------------------------- */

function BalanceStrip({ plan }: { plan: NonNullable<ReturnType<typeof useReceiptPilePlan>['data']> }) {
  const { t } = useTranslation();
  const average = plan.total_receipts / Math.max(plan.piles.length, 1);

  return (
    <Card>
      <CardContent className="grid gap-3 py-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <h2 className="text-sm font-semibold">{t('receiptPiles.balance.title')}</h2>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Stat label={t('receiptPiles.balance.receipts')} value={plan.total_receipts} />
            <Stat label={t('receiptPiles.balance.dropOffs')} value={plan.total_drop_offs} />
            <Stat
              label={t('receiptPiles.balance.spread')}
              value={`${plan.heaviest_pile} / ${plan.lightest_pile}`}
            />
            <Stat label={t('receiptPiles.balance.average')} value={Math.round(average)} />
          </dl>
        </div>

        <div className="flex h-12 gap-1">
          {plan.piles.map((pile) => {
            const hot = pile.receipt_count > average * 1.2;
            const cold = pile.receipt_count < average * 0.8;
            return (
              <div
                key={pile.index}
                style={{ flex: Math.max(pile.receipt_count, 1) }}
                title={`${t('receiptPiles.box', { n: pile.index })} — ${pile.label}`}
                className={cn(
                  'grid min-w-0 place-items-center overflow-hidden rounded-md border border-transparent text-center',
                  hot
                    ? 'border-warning/40 bg-warning/15'
                    : cold
                      ? 'border-success/40 bg-success/10'
                      : 'bg-primary/10',
                )}
              >
                <span className="px-1">
                  <b className="block text-sm font-semibold tabular-nums">{pile.receipt_count}</b>
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
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* One box                                                                     */
/* -------------------------------------------------------------------------- */

function PileCard({
  pile,
}: {
  pile: NonNullable<ReturnType<typeof useReceiptPilePlan>['data']>['piles'][number];
}) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden">
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          {t('receiptPiles.box', { n: pile.index })}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-lg font-semibold tracking-widest text-primary"
          title={pile.label}
        >
          {pile.label}
        </span>
        <span className="whitespace-nowrap text-end text-[11px] leading-tight text-muted-foreground tabular-nums">
          {t('receiptPiles.receiptCount', { count: pile.receipt_count })}
          <br />
          {t('receiptPiles.pointCount', { count: pile.drop_off_count })}
        </span>
      </header>
      <ul className="max-h-72 overflow-y-auto py-1">
        {pile.letters.flatMap((letter) =>
          letter.drop_offs.map((drop, i) => (
            <li
              key={`${letter.letter}-${drop.name}`}
              className="flex items-baseline gap-2 border-t border-border/50 px-3 py-1 first:border-t-0"
            >
              <span
                className={cn(
                  'w-4 shrink-0 text-xs font-semibold text-primary/75',
                  i > 0 && 'invisible',
                )}
                aria-hidden={i > 0}
              >
                {letter.letter}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm" title={drop.name}>
                {drop.name}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {drop.receipt_count}
              </span>
            </li>
          )),
        )}
      </ul>
    </Card>
  );
}

export default ReceiptPilesPage;
