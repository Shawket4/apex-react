import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, CheckCircle2, Snowflake } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { DatePicker } from '@/shared/ui/date-picker';
import { Label } from '@/shared/ui/label';
import { NativeSelect } from '@/shared/ui/native-select';
import { extractErrorMessage } from '@/shared/api/errors';
import { cn } from '@/shared/lib/cn';
import { formatCurrency, formatNumber } from '@/shared/lib/format';
import { useReprice } from '@/entities/pricing/queries';
import type { RepriceInput, RepriceResult, RepriceTotals } from '@/entities/pricing/schemas';
import { formatDay, formatMonth } from './pricing-format';

export interface RepriceRequest {
  from: string;
  to?: string;
  company?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: RepriceRequest | null;
  companies: string[];
  today: string;
}

type Step =
  | { kind: 'form' }
  | { kind: 'confirm'; includeFrozen: boolean }
  | { kind: 'frozen'; months: string[] }
  | { kind: 'done'; result: RepriceResult };

/**
 * Re-price trips dated in a range under the rules effective on their dates
 * (permission 4).
 *
 * Nothing is sent until the person has seen exactly what will be re-priced
 * and confirmed it. A range that touches a frozen month (one already closed
 * and invoiced) is refused by the server with the months it would re-open;
 * re-opening them is a separate, explicit tick.
 */
export function RepriceDialog({ open, onOpenChange, initial, companies, today }: Props) {
  const { t, i18n } = useTranslation();
  const reprice = useReprice();
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [step, setStep] = React.useState<Step>({ kind: 'form' });
  const [frozenAck, setFrozenAck] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const start = initial?.from ?? today;
    setFrom(start);
    setTo(initial?.to ?? (start > today ? start : today));
    setCompany(initial?.company ?? '');
    setStep({ kind: 'form' });
    setFrozenAck(false);
    setError(null);
    reprice.reset();
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rangeValid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;
  const range = { from: formatDay(from, i18n.language), to: formatDay(to, i18n.language) };
  const scope = company || t('pricing.reprice.allCompanies');

  const send = async (includeFrozen: boolean) => {
    setError(null);
    const input: RepriceInput = { from, to };
    if (company) input.company = company;
    if (includeFrozen) input.include_frozen = true;
    try {
      const outcome = await reprice.mutateAsync(input);
      if (outcome.kind === 'frozen') {
        setFrozenAck(false);
        setStep({ kind: 'frozen', months: outcome.months });
      } else {
        setStep({ kind: 'done', result: outcome.result });
      }
    } catch (err) {
      setError(extractErrorMessage(err, t('pricing.reprice.failed')));
    }
  };

  const busy = reprice.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl" data-testid="reprice-dialog">
        <DialogHeader>
          <DialogTitle>
            {step.kind === 'done' ? t('pricing.reprice.doneTitle') : t('pricing.reprice.title')}
          </DialogTitle>
          {step.kind === 'form' && (
            <DialogDescription>{t('pricing.reprice.description')}</DialogDescription>
          )}
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {step.kind === 'form' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (rangeValid) setStep({ kind: 'confirm', includeFrozen: false });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid content-start gap-1.5">
                <Label htmlFor="reprice-from">{t('common.from')}</Label>
                <DatePicker id="reprice-from" value={from} max={from > today ? from : today} onChange={setFrom} className="w-full" />
              </div>
              <div className="grid content-start gap-1.5">
                <Label htmlFor="reprice-to">{t('common.to')}</Label>
                <DatePicker id="reprice-to" value={to} min={from || undefined} max={to > today ? to : today} onChange={setTo} className="w-full" />
              </div>
            </div>
            {!rangeValid && from && to && (
              <p className="text-xs text-destructive">{t('pricing.reprice.badRange')}</p>
            )}
            <div className="grid content-start gap-1.5">
              <Label htmlFor="reprice-company">
                {t('pricing.reprice.company')}{' '}
                <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
              </Label>
              <NativeSelect id="reprice-company" value={company} onChange={(e) => setCompany(e.target.value)}>
                <option value="">{t('pricing.reprice.allCompanies')}</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <DialogFooter className="gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!rangeValid}>
                {t('pricing.reprice.review')}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step.kind === 'confirm' && (
          <div className="space-y-4" data-testid="reprice-confirm">
            <div className="rounded-md border bg-muted/30 px-3 py-3 text-sm">
              <p className="font-medium">{t('pricing.reprice.confirmLead')}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">{t('pricing.reprice.range')}</dt>
                <dd className="font-mono tabular-nums">
                  {t('pricing.reprice.rangeValue', range)}
                </dd>
                <dt className="text-muted-foreground">{t('pricing.reprice.company')}</dt>
                <dd dir="auto">{scope}</dd>
              </dl>
            </div>
            <p className="text-sm text-muted-foreground">{t('pricing.reprice.confirmBody')}</p>
            {step.includeFrozen && (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t('pricing.reprice.includesFrozen')}
              </p>
            )}
            <DialogFooter className="gap-2 border-t pt-4">
              <Button variant="outline" disabled={busy} onClick={() => setStep({ kind: 'form' })}>
                {t('common.back')}
              </Button>
              <Button
                variant={step.includeFrozen ? 'destructive' : 'default'}
                disabled={busy}
                onClick={() => void send(step.includeFrozen)}
              >
                {busy ? t('pricing.reprice.running') : t('pricing.reprice.confirm')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step.kind === 'frozen' && (
          <div className="space-y-4" data-testid="reprice-frozen">
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Snowflake className="h-4 w-4 shrink-0" aria-hidden />
                {t('pricing.reprice.frozenTitle', { count: step.months.length })}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {step.months.map((m) => (
                  <li key={m} className="rounded-full border bg-background px-2.5 py-0.5 text-[12px]">
                    {formatMonth(m, i18n.language)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">{t('pricing.reprice.frozenBody')}</p>
            </div>
            <label className="flex items-start gap-2.5 rounded-md border border-destructive/40 px-3 py-3 text-sm">
              <Checkbox
                checked={frozenAck}
                onCheckedChange={(v) => setFrozenAck(v === true)}
                className="mt-0.5"
                aria-describedby="reprice-frozen-warning"
              />
              <span className="space-y-1">
                <span className="block font-medium">{t('pricing.reprice.includeFrozen')}</span>
                <span id="reprice-frozen-warning" className="block text-destructive">
                  {t('pricing.reprice.includeFrozenWarning')}
                </span>
              </span>
            </label>
            <DialogFooter className="gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setStep({ kind: 'form' })}>
                {t('pricing.reprice.changeRange')}
              </Button>
              <Button
                variant="destructive"
                disabled={!frozenAck}
                onClick={() => setStep({ kind: 'confirm', includeFrozen: true })}
              >
                {t('pricing.reprice.continueWithFrozen')}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step.kind === 'done' && (
          <ResultView result={step.result} range={range} scope={scope} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const TOTAL_ROWS: { key: keyof RepriceTotals; money: boolean }[] = [
  { key: 'trips', money: false },
  { key: 'unpriced', money: false },
  { key: 'base_revenue', money: true },
  { key: 'revenue_vat', money: true },
  { key: 'rental', money: true },
  { key: 'rental_vat', money: true },
  { key: 'total', money: true },
];

function ResultView({
  result,
  range,
  scope,
  onClose,
}: {
  result: RepriceResult;
  range: { from: string; to: string };
  scope: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const fmt = (money: boolean, n: number) => (money ? formatCurrency(n) : formatNumber(n, 0));
  const signed = (money: boolean, n: number) => {
    if (Math.abs(n) < 0.005) return '—';
    return `${n > 0 ? '+' : '−'}${fmt(money, Math.abs(n))}`;
  };

  return (
    <div className="space-y-4" data-testid="reprice-result">
      <div className="flex items-start gap-3 rounded-md border border-success/40 bg-success/10 px-3 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <div className="space-y-0.5">
          <p>
            {t('pricing.reprice.doneBody', {
              count: result.trips_repriced,
              n: formatNumber(result.trips_repriced, 0),
              changed: formatNumber(result.trips_changed, 0),
            })}
          </p>
          <p className="text-muted-foreground">
            {t('pricing.reprice.rangeValue', range)} · <span dir="auto">{scope}</span> ·{' '}
            {t('pricing.reprice.monthsRecomputed', {
              count: result.months_recomputed.length,
              n: formatNumber(result.months_recomputed.length, 0),
            })}
          </p>
        </div>
      </div>

      {result.pricing_errors > 0 && (
        <p className="flex items-start gap-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('pricing.reprice.pricingErrors', {
            count: result.pricing_errors,
            n: formatNumber(result.pricing_errors, 0),
          })}
        </p>
      )}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-medium">
                <span className="sr-only">{t('pricing.reprice.figure')}</span>
              </th>
              <th className="px-3 py-2 text-end font-medium">{t('pricing.reprice.before')}</th>
              <th className="hidden px-1 py-2 sm:table-cell" aria-hidden />
              <th className="px-3 py-2 text-end font-medium">{t('pricing.reprice.after')}</th>
              <th className="hidden px-3 py-2 text-end font-medium sm:table-cell">
                {t('pricing.reprice.change')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {TOTAL_ROWS.map(({ key, money }) => {
              const before = result.before[key];
              const after = result.after[key];
              const delta = after - before;
              const isTotal = key === 'total';
              return (
                <tr key={key} className={cn(isTotal && 'bg-muted/30 font-semibold')}>
                  <th scope="row" className="px-3 py-1.5 text-start font-normal text-muted-foreground sm:whitespace-nowrap">
                    <span className={cn(isTotal && 'font-semibold text-foreground')}>
                      {t(`pricing.totals.${key}`)}
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-3 py-1.5 text-end font-mono tabular-nums">
                    {fmt(money, before)}
                  </td>
                  <td className="hidden px-1 text-muted-foreground sm:table-cell" aria-hidden>
                    <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-end font-mono tabular-nums">
                    {fmt(money, after)}
                  </td>
                  <td
                    className={cn(
                      'hidden whitespace-nowrap px-3 py-1.5 text-end font-mono tabular-nums sm:table-cell',
                      delta > 0.005 && 'text-success',
                      delta < -0.005 && 'text-destructive',
                    )}
                  >
                    {signed(money, delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogFooter>
    </div>
  );
}
