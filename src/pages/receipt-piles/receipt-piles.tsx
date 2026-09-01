import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { saveAs } from 'file-saver';
import { AlertTriangle, Boxes, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage } from '@/shared/api/errors';
import { useScope } from '@/shared/scope';
import { format } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

import {
  useExportReceiptPiles,
  useReceiptPilePlan,
} from '@/entities/receipt-pile/queries';
import {
  MAX_PILES,
  PILE_MODES,
  type PileMode,
  type PilePlanParams,
} from '@/entities/receipt-pile/schemas';
import { ReceiptPilesBalance } from '@/widgets/receipt-piles/receipt-piles-balance';
import { ReceiptPilesBoxes } from '@/widgets/receipt-piles/receipt-piles-boxes';
import { ReceiptPilesControls } from '@/widgets/receipt-piles/receipt-piles-controls';

/* -------------------------------------------------------------------------- */
/* Receipt piles                                                               */
/*                                                                            */
/* Once a month the Watanya receipts come back as one heap and have to be      */
/* filed by drop-off point. This screen says which physical boxes to make and  */
/* what goes in each: boxes labelled with a run of Arabic letters, and inside  */
/* each, the drop-off names in alphabetical order.                             */
/*                                                                            */
/* Dates come from the GLOBAL scope bar in the header — this page does not own */
/* a date picker, same as trips and the dashboard. `range` is already Cairo    */
/* calendar days (YYYY-MM-DD), which is exactly what the endpoint takes.       */
/*                                                                            */
/* Everything on screen is computed by the backend (FalconGo's                 */
/* services/ReceiptPiles.go). This component owns the mode and the box count   */
/* and nothing else, and the export sends the same parameters to the same      */
/* endpoint's /export — so the workbook is always the plan being looked at.    */
/* -------------------------------------------------------------------------- */

const isMode = (v: string | null): v is PileMode =>
  !!v && (PILE_MODES as readonly string[]).includes(v);

export default function ReceiptPilesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Dates come from the global header scope (URL), like every other module.
  const { range } = useScope();

  /* ---- Page-owned state (URL-backed, so a plan survives a refresh) ---- */

  const [mode, setMode] = React.useState<PileMode>(() =>
    isMode(searchParams.get('pm')) ? (searchParams.get('pm') as PileMode) : 'balanced',
  );
  /** null = let the server choose a count from the range. */
  const [boxes, setBoxes] = React.useState<number | null>(() => {
    const raw = Number(searchParams.get('pb'));
    return Number.isInteger(raw) && raw >= 1 && raw <= MAX_PILES ? raw : null;
  });

  React.useEffect(() => {
    setSearchParams(
      (prev) => {
        // Start from the CURRENT params so the global scope's keys survive.
        const next = new URLSearchParams(prev);
        if (mode !== 'balanced') next.set('pm', mode);
        else next.delete('pm');
        if (boxes !== null) next.set('pb', String(boxes));
        else next.delete('pb');
        return next;
      },
      { replace: true },
    );
  }, [mode, boxes, setSearchParams]);

  /* ---- Server data ---- */

  const params: PilePlanParams = React.useMemo(
    () => ({
      startDate: range.from,
      endDate: range.to,
      mode,
      ...(mode === 'balanced' && boxes ? { piles: boxes } : {}),
    }),
    [range.from, range.to, mode, boxes],
  );

  const { data: plan, isPending, isFetching, isError, error, refetch } =
    useReceiptPilePlan(params);
  const exportPlan = useExportReceiptPiles();

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportPlan.mutateAsync(params);
      saveAs(blob, filename);
      toast.success(t('receiptPiles.export.success'));
    } catch (err) {
      toast.error(extractErrorMessage(err, t('receiptPiles.export.failed')));
    }
  };

  /* ---- Render ---- */

  const actions = (
    <>
      <ReceiptPilesControls
        params={params}
        boxCount={plan?.piles.length ?? 0}
        auto={boxes === null}
        onModeChange={setMode}
        onBoxCountChange={setBoxes}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleExport()}
        disabled={exportPlan.isPending || !plan || plan.piles.length === 0}
      >
        {exportPlan.isPending ? (
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        ) : (
          <FileSpreadsheet />
        )}
        <span className="hidden sm:inline">{t('receiptPiles.export.action')}</span>
      </Button>
    </>
  );

  return (
    <PageShell
      icon={<Boxes className="h-5 w-5" />}
      title={t('receiptPiles.title')}
      description={
        // dir="ltr": the range is a Latin-numeral date pair, and left to the
        // page direction the bidi algorithm reorders it to "Jul – 31 Jul 2026 1"
        // in Arabic.
        <span dir="ltr">
          {range.from === range.to
            ? format(range.from, 'd MMMM yyyy')
            : `${format(range.from, 'd MMM')} – ${format(range.to, 'd MMM yyyy')}`}
        </span>
      }
      actions={actions}
    >
      {isError ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <span className="min-w-0">
            {extractErrorMessage(error, t('receiptPiles.loadFailed'))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="ms-auto h-7 shrink-0 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:text-warning"
          >
            <RefreshCw aria-hidden />
            {t('common.retry')}
          </Button>
        </div>
      ) : isPending ? (
        <>
          <Skeleton className="h-[168px] rounded-lg" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </>
      ) : plan.piles.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title={t('receiptPiles.empty.title')}
          description={t('receiptPiles.empty.description')}
        />
      ) : (
        <div
          className={cn(
            'flex flex-col gap-3',
            // A re-split is fast; dimming beats a skeleton that throws the
            // whole page away for a change of one box.
            isFetching && 'opacity-60 transition-opacity',
          )}
        >
          <ReceiptPilesBalance plan={plan} />
          <ReceiptPilesBoxes piles={plan.piles} />
        </div>
      )}
    </PageShell>
  );
}
