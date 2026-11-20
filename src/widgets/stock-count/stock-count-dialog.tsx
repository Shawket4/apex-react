import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';
import {
  attemptFor,
  countChange,
  parseCounted,
  type CountAttempt,
  type StockKind,
} from '@/entities/maint-stock/lib';
import { useCountOil, useCountTires } from '@/entities/maint-stock/queries';
import { ApiError, extractErrorMessage } from '@/shared/api/errors';
import { formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

/** The stock line being counted, with the book figure the page shows. */
export type StockCountLine =
  | { kind: 'tires'; brand: string; model: string; size: string; book: number }
  | { kind: 'oil'; oilType: string; book: number };

/** What the garage system answered, in one shape for both kinds. */
interface Outcome {
  before: number | null;
  after: number | null;
  change: number | null;
}

/** The server keeps a note to 120 characters. */
const NOTE_MAX = 120;

function lineName(line: StockCountLine): string {
  return line.kind === 'tires'
    ? [line.brand, line.model, line.size].filter(Boolean).join(' · ')
    : line.oilType;
}

function CountForm({ line, onClose }: { line: StockCountLine; onClose: () => void }) {
  const { t } = useTranslation();
  const kind: StockKind = line.kind;
  const countTires = useCountTires();
  const countOil = useCountOil();
  const [raw, setRaw] = React.useState('');
  const [note, setNote] = React.useState('');
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const attempt = React.useRef<CountAttempt | null>(null);
  const pending = countTires.isPending || countOil.isPending;

  /** A figure as this stock is counted: tires bare, oil in liters. */
  const amount = (value: number | null) =>
    value === null
      ? '—'
      : kind === 'oil'
        ? t('tiresStock.count.liters', { n: formatNumber(value, Number.isInteger(value) ? 0 : 2) })
        : formatNumber(value);

  const counted = parseCounted(raw, kind);
  const invalid = raw.trim() !== '' && counted === null;
  const change = counted === null ? null : countChange(line.book, counted);

  const fail = (cause: unknown) => {
    setError(
      cause instanceof ApiError && cause.status === 403
        ? t('tiresStock.count.errors.forbidden')
        : extractErrorMessage(cause, t('tiresStock.count.errors.failed')),
    );
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (counted === null || pending) return;
    setError(null);
    const trimmedNote = note.trim();
    // One reference per count; the same count sent again keeps it.
    attempt.current = attemptFor(attempt.current, `${counted}|${trimmedNote}`, () =>
      crypto.randomUUID(),
    );
    const shared = { ref_id: attempt.current.refId, ...(trimmedNote ? { note: trimmedNote } : {}) };
    if (line.kind === 'tires') {
      countTires.mutate(
        { brand: line.brand, model: line.model, size: line.size, counted, ...shared },
        {
          onSuccess: (result) =>
            setOutcome({ before: result.before, after: result.on_hand_qty, change: result.change }),
          onError: fail,
        },
      );
    } else {
      countOil.mutate(
        { oil_type: line.oilType, counted_liters: counted, ...shared },
        {
          onSuccess: (result) =>
            setOutcome({
              before: result.before,
              after: result.liters_on_hand,
              change: result.change,
            }),
          onError: fail,
        },
      );
    }
  };

  if (outcome) {
    const moved = outcome.change ?? 0;
    const key = moved < 0 ? 'remove' : moved > 0 ? 'add' : 'same';
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            {t('tiresStock.count.result.title')}
          </DialogTitle>
          <DialogDescription dir="ltr" className="text-start">
            {lineName(line)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm" role="status">
          <p className="font-medium">
            {t(`tiresStock.count.result.${key}`, {
              before: amount(outcome.before),
              after: amount(outcome.after),
              amount: amount(Math.abs(moved)),
            })}
          </p>
          {outcome.before !== null && outcome.before !== line.book && (
            <p className="text-muted-foreground">
              {t('tiresStock.count.result.bookDiffered', { book: amount(line.book) })}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('tiresStock.count.result.lag')}</p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{t('tiresStock.count.title')}</DialogTitle>
        <DialogDescription dir="ltr" className="text-start">
          {lineName(line)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p>{t('tiresStock.count.purpose')}</p>
      </div>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{t('tiresStock.count.book')}</span>
        <span className="font-mono text-base font-semibold tabular-nums">{amount(line.book)}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stock-count-counted">
          {t(kind === 'oil' ? 'tiresStock.count.countedOil' : 'tiresStock.count.countedTires')}
        </Label>
        <Input
          id="stock-count-counted"
          // Text, not number: a number field refuses the ٠-٩ an Arabic keyboard types.
          type="text"
          inputMode={kind === 'oil' ? 'decimal' : 'numeric'}
          autoComplete="off"
          dir="ltr"
          className="tabular-nums"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          aria-invalid={invalid}
          aria-describedby="stock-count-readback"
          disabled={pending}
        />
        {invalid && (
          <p className="text-[11px] font-medium text-destructive">
            {t(kind === 'oil' ? 'tiresStock.count.invalidOil' : 'tiresStock.count.invalidTires')}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="stock-count-note">{t('tiresStock.count.note')}</Label>
        <Input
          id="stock-count-note"
          dir="auto"
          maxLength={NOTE_MAX}
          placeholder={t('tiresStock.count.notePlaceholder')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={pending}
        />
      </div>

      {/* Said back before anything is sent: what this count will do. */}
      <p id="stock-count-readback" aria-live="polite" className="min-h-5 text-sm font-medium">
        {change && counted !== null
          ? t(`tiresStock.count.readback.${change.direction}`, {
              book: amount(line.book),
              counted: amount(counted),
              amount: amount(change.amount),
            })
          : null}
      </p>

      {error && (
        <div role="alert" className="space-y-0.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">{t('tiresStock.count.errors.retryHint')}</p>
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={counted === null || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {error ? t('common.retry') : t('tiresStock.count.submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface StockCountDialogProps {
  /** The line to count; the last one stays rendered while the dialog leaves. */
  line: StockCountLine | null;
  /**
   * Changes with each opening, so every count starts from an empty form. It
   * must change in the same update that opens the dialog, never while it is
   * open: re-keying a form someone is typing in loses what they typed.
   */
  opening: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "We counted N": the book figure, the figure on the shelf, what the
 * difference will do, then what the garage system did. A count corrects a
 * difference; a delivery is a shipment, not a count.
 */
export function StockCountDialog({ line, opening, open, onOpenChange }: StockCountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {line && <CountForm key={opening} line={line} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
