import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { intentProps } from '@/shared/lib/prefetch';
import { prefetchReceiptPilePlan } from '@/entities/receipt-pile/queries';
import {
  MAX_PILES,
  PILE_MODES,
  type PileMode,
  type PilePlanParams,
} from '@/entities/receipt-pile/schemas';

interface Props {
  params: PilePlanParams;
  /** Boxes actually returned — the server may hand back fewer than asked. */
  boxCount: number;
  /** True while the server is choosing the count. */
  auto: boolean;
  onModeChange: (mode: PileMode) => void;
  onBoxCountChange: (count: number | null) => void;
}

/**
 * Mode switch and box stepper.
 *
 * Both step from the count that came BACK, not the one that was asked for:
 * the server drops boxes that cannot make the heaviest box any lighter, so
 * stepping from the request would make the first click after an auto plan
 * jump by more than one.
 *
 * Every control warms its own result on hover — the plan is a cheap query and
 * the click is already decided by the time the pointer lands.
 */
export function ReceiptPilesControls({
  params,
  boxCount,
  auto,
  onModeChange,
  onBoxCountChange,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const step = (next: number) =>
    onBoxCountChange(Math.min(MAX_PILES, Math.max(1, next)));

  return (
    <>
      <div
        role="group"
        aria-label={t('receiptPiles.mode.label')}
        className="inline-flex h-9 overflow-hidden rounded-md border"
      >
        {PILE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={params.mode === mode}
            onClick={() => onModeChange(mode)}
            {...intentProps(() =>
              prefetchReceiptPilePlan(queryClient, { ...params, mode }),
            )}
            className={cn(
              'px-3 text-xs font-medium transition-colors',
              params.mode === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t(`receiptPiles.mode.${mode}`)}
          </button>
        ))}
      </div>

      {params.mode === 'balanced' && (
        <div className="inline-flex h-9 items-center rounded-md border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('receiptPiles.fewerBoxes')}
            disabled={boxCount <= 1}
            onClick={() => step(boxCount - 1)}
            {...intentProps(() =>
              prefetchReceiptPilePlan(queryClient, {
                ...params,
                piles: Math.max(1, boxCount - 1),
              }),
            )}
          >
            <Minus />
          </Button>
          <span
            className="min-w-[3rem] text-center text-sm font-semibold tabular-nums"
            aria-live="polite"
          >
            {boxCount || '—'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('receiptPiles.moreBoxes')}
            disabled={boxCount >= MAX_PILES}
            onClick={() => step(boxCount + 1)}
            {...intentProps(() =>
              prefetchReceiptPilePlan(queryClient, {
                ...params,
                piles: Math.min(MAX_PILES, boxCount + 1),
              }),
            )}
          >
            <Plus />
          </Button>
          {!auto && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 border-s"
              aria-label={t('receiptPiles.auto')}
              title={t('receiptPiles.auto')}
              onClick={() => onBoxCountChange(null)}
            >
              <RotateCcw />
            </Button>
          )}
        </div>
      )}
    </>
  );
}
