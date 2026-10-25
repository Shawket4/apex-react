import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { nextBandNumber, type BandRow } from '@/entities/pricing/form';

interface Props {
  rows: BandRow[];
  onChange: (rows: BandRow[]) => void;
  /** Per row index → i18n key under pricing.form.errors. */
  errors?: Record<number, string>;
  disabled?: boolean;
}

/**
 * Watanya's band table: one rate per 1,000 L for each band a route can be in.
 *
 * Rows are keyed by position, never by the band number being typed, so editing
 * a number cannot remount the input under the cursor.
 */
export function BandTableEditor({ rows, onChange, errors, disabled }: Props) {
  const { t } = useTranslation();

  const patch = (i: number, p: Partial<BandRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  return (
    <div className="space-y-2" data-testid="band-table-editor">
      {/* Two columns of bands from sm up, so fifteen rows fit without a long scroll. */}
      <div className="grid gap-x-5 sm:grid-cols-2" aria-hidden>
        {[0, 1].map((col) => (
          <div
            key={col}
            className={`grid grid-cols-[4.5rem_1fr_2.25rem] gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${col === 1 ? 'hidden sm:grid' : ''}`}
          >
            <span>{t('pricing.form.bandColumn')}</span>
            <span>{t('pricing.form.bandRateColumn')}</span>
            <span />
          </div>
        ))}
      </div>
      {/* Down the first column, then the second, like a printed table. */}
      <ol
        className="grid gap-x-5 gap-y-1.5 sm:grid-flow-col sm:grid-cols-2"
        style={{ gridTemplateRows: `repeat(${Math.ceil(rows.length / 2)}, auto)` }}
      >
        {rows.map((row, i) => {
          const error = errors?.[i];
          const errorId = error ? `band-row-${i}-error` : undefined;
          return (
            <li key={i}>
              <div className="grid grid-cols-[4.5rem_1fr_2.25rem] items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={row.band}
                  disabled={disabled}
                  aria-label={t('pricing.form.bandNumberLabel', { n: i + 1 })}
                  aria-invalid={error === 'bandNumber' || error === 'bandDuplicate' || undefined}
                  aria-describedby={errorId}
                  onChange={(e) => patch(i, { band: e.target.value })}
                  className="font-mono tabular-nums"
                />
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={row.rate}
                    disabled={disabled}
                    aria-label={t('pricing.form.bandRateLabel', { band: row.band || i + 1 })}
                    aria-invalid={error === 'bandRate' || undefined}
                    aria-describedby={errorId}
                    onChange={(e) => patch(i, { rate: e.target.value })}
                    className="pe-12 font-mono tabular-nums"
                    placeholder="0.00"
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {t('common.currencyCode')}
                  </span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  disabled={disabled || rows.length <= 1}
                  aria-label={t('pricing.form.removeBand', { band: row.band || i + 1 })}
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
              {error && (
                <p id={errorId} className="mt-0.5 text-xs text-destructive">
                  {t(`pricing.form.errors.${error}`)}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...rows, { band: String(nextBandNumber(rows)), rate: '' }])}
      >
        <Plus />
        {t('pricing.form.addBand')}
      </Button>
    </div>
  );
}
