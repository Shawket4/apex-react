import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect } from '@/shared/ui/native-select';
import { Textarea } from '@/shared/ui/textarea';
import { ApiError, extractErrorMessage } from '@/shared/api/errors';
import { formatNumber } from '@/shared/lib/format';
import {
  defaultEffectiveFrom,
  formFromRule,
  hasErrors,
  serializeRuleForm,
  validateRuleForm,
  type RuleFormErrors,
  type RuleFormValues,
} from '@/entities/pricing/form';
import { useCreatePricingRule } from '@/entities/pricing/queries';
import {
  PRICING_METHODS,
  RENTAL_MODES,
  type PricingCompany,
  type RentalMode,
} from '@/entities/pricing/schemas';
import { BandTableEditor } from './band-table-editor';
import { formatDay } from './pricing-format';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: PricingCompany | null;
  today: string;
  /** "Re-price trips from <effective_from>" after a save. */
  onReprice: (from: string, company: string) => void;
}

type Saved = { effectiveFrom: string; unrepriced: number };

/**
 * A new effective-dated version of one company's pricing (permission 4).
 *
 * Seeded from the version in force, so a rate change is one edit. Versions
 * are append-only; saving never moves a trip already priced. The response
 * says how many it would, and offers the re-price that does.
 */
export function PricingRuleFormDialog({ open, onOpenChange, company, today, onReprice }: Props) {
  const { t } = useTranslation();
  const [saved, setSaved] = React.useState<Saved | null>(null);

  // A fresh form per opening; the content stays mounted through the exit.
  React.useEffect(() => {
    if (open) setSaved(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {company && (
          <>
            <DialogHeader>
              <DialogTitle>
                {saved ? t('pricing.form.savedTitle') : t('pricing.form.title', { company: company.company })}
              </DialogTitle>
              {!saved && <DialogDescription>{t('pricing.form.description')}</DialogDescription>}
            </DialogHeader>
            {saved ? (
              <SavedView
                company={company.company}
                saved={saved}
                onClose={() => onOpenChange(false)}
                onReprice={() => {
                  onOpenChange(false);
                  onReprice(saved.effectiveFrom, company.company);
                }}
              />
            ) : (
              open && (
                <RuleForm
                  key={company.company}
                  company={company}
                  today={today}
                  onCancel={() => onOpenChange(false)}
                  onSaved={setSaved}
                />
              )
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RuleForm({
  company,
  today,
  onCancel,
  onSaved,
}: {
  company: PricingCompany;
  today: string;
  onCancel: () => void;
  onSaved: (s: Saved) => void;
}) {
  const { t, i18n } = useTranslation();
  const create = useCreatePricingRule();
  const base = company.rules.find((r) => r.id === company.current_rule_id) ?? company.rules[0];
  const [values, setValues] = React.useState<RuleFormValues>(() =>
    formFromRule(company.company, base, today),
  );
  const [dateTouched, setDateTouched] = React.useState(false);
  const [errors, setErrors] = React.useState<RuleFormErrors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const existingDates = React.useMemo(
    () => company.rules.map((r) => r.effective_from),
    [company.rules],
  );

  const set = <K extends keyof RuleFormValues>(key: K, value: RuleFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const setRentalMode = (mode: RentalMode) =>
    setValues((v) => ({
      ...v,
      rental_mode: mode,
      // The default start follows the rental mode until the person picks a date.
      effective_from: dateTouched ? v.effective_from : defaultEffectiveFrom(mode, today),
    }));

  // After the first submit, errors follow the values as they are corrected.
  React.useEffect(() => {
    if (submitted) setErrors(validateRuleForm(values, existingDates));
  }, [submitted, values, existingDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    const found = validateRuleForm(values, existingDates);
    setErrors(found);
    if (hasErrors(found)) return;
    try {
      const res = await create.mutateAsync(serializeRuleForm(values));
      onSaved({ effectiveFrom: res.rule.effective_from || values.effective_from, unrepriced: res.unrepriced_trips });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors((x) => ({ ...x, effective_from: 'duplicateDate' }));
      } else {
        setServerError(extractErrorMessage(err, t('pricing.form.saveFailed')));
      }
    }
  };

  const err = (k: keyof RuleFormValues) =>
    errors[k] ? (
      <p id={`rule-${k}-error`} className="text-xs text-destructive">
        {t(`pricing.form.errors.${errors[k]}`)}
      </p>
    ) : null;
  const invalid = (k: keyof RuleFormValues) =>
    errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `rule-${k}-error` } : {};

  const startsInPast = values.effective_from && values.effective_from <= today;
  const startsMidMonth =
    values.rental_mode !== 'none' && values.effective_from && !values.effective_from.endsWith('-01');
  const maxDate = `${Number(today.slice(0, 4)) + 3}-12-31`;
  const busy = create.isPending;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{serverError}</span>
        </div>
      )}

      {/* When ------------------------------------------------------------ */}
      <div className="grid content-start gap-1.5">
        <Label htmlFor="rule-effective-from">{t('pricing.form.effectiveFrom')}</Label>
        <DatePicker
          id="rule-effective-from"
          value={values.effective_from}
          max={maxDate}
          disabled={busy}
          onChange={(d) => {
            setDateTouched(true);
            set('effective_from', d);
          }}
          className="w-full sm:w-64"
        />
        {err('effective_from')}
        {values.rental_mode !== 'none' && (
          <Hint tone={startsMidMonth ? 'warning' : 'info'}>{t('pricing.form.rentalMonthHint')}</Hint>
        )}
        {startsInPast && <Hint tone="info">{t('pricing.form.pastDateHint')}</Hint>}
      </div>

      {/* How a trip is priced ------------------------------------------- */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">{t('pricing.form.tripPricing')}</legend>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="rule-method">{t('pricing.rule.method')}</Label>
          <NativeSelect
            id="rule-method"
            value={values.method}
            disabled={busy}
            onChange={(e) => set('method', e.target.value as RuleFormValues['method'])}
          >
            {PRICING_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`pricing.method.${m}`)}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">{t(`pricing.methodHint.${values.method}`)}</p>
        </div>

        {values.method === 'per_km' && (
          <div className="grid content-start gap-1.5">
            <Label htmlFor="rule-per-km">{t('pricing.form.perKmRate')}</Label>
            <Suffixed suffix={t('pricing.form.perKmUnit')}>
              <Input
                id="rule-per-km"
                inputMode="decimal"
                value={values.per_km_rate}
                disabled={busy}
                onChange={(e) => set('per_km_rate', e.target.value)}
                className="pe-20 font-mono tabular-nums"
                {...invalid('per_km_rate')}
              />
            </Suffixed>
            {err('per_km_rate')}
          </div>
        )}

        {values.method === 'band_per_1000l' && (
          <div className="grid content-start gap-1.5">
            <p className="text-sm font-medium">{t('pricing.rule.bandTable')}</p>
            <BandTableEditor
              rows={values.bands}
              disabled={busy}
              errors={errors.bandRows}
              onChange={(bands) => set('bands', bands)}
            />
            {errors.bands && !errors.bandRows && (
              <p className="text-xs text-destructive">{t(`pricing.form.errors.${errors.bands}`)}</p>
            )}
          </div>
        )}

        <div className="grid content-start gap-1.5">
          <Label htmlFor="rule-vat">{t('pricing.form.vatPercent')}</Label>
          <Suffixed suffix="%">
            <Input
              id="rule-vat"
              inputMode="decimal"
              value={values.vat_percent}
              disabled={busy}
              onChange={(e) => set('vat_percent', e.target.value)}
              className="pe-8 font-mono tabular-nums"
              {...invalid('vat_percent')}
            />
          </Suffixed>
          {err('vat_percent')}
        </div>
      </fieldset>

      {/* Car rental ------------------------------------------------------ */}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">{t('pricing.rule.rental')}</legend>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="rule-rental-mode">{t('pricing.form.rentalMode')}</Label>
          <NativeSelect
            id="rule-rental-mode"
            value={values.rental_mode}
            disabled={busy}
            onChange={(e) => setRentalMode(e.target.value as RentalMode)}
          >
            {RENTAL_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`pricing.rentalMode.${m}`)}
              </option>
            ))}
          </NativeSelect>
        </div>

        {values.rental_mode !== 'none' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-1.5">
              <Label htmlFor="rule-rental-amount">
                {values.rental_mode === 'monthly_taper'
                  ? t('pricing.form.rentalPerMonth')
                  : t('pricing.form.rentalPerDay')}
              </Label>
              <Suffixed suffix={t('common.currencyCode')}>
                <Input
                  id="rule-rental-amount"
                  inputMode="decimal"
                  value={values.rental_amount}
                  disabled={busy}
                  onChange={(e) => set('rental_amount', e.target.value)}
                  className="pe-12 font-mono tabular-nums"
                  {...invalid('rental_amount')}
                />
              </Suffixed>
              {err('rental_amount')}
            </div>
            {values.rental_mode === 'monthly_taper' && (
              <div className="grid content-start gap-1.5">
                <Label htmlFor="rule-full-days">{t('pricing.form.fullDays')}</Label>
                <Input
                  id="rule-full-days"
                  inputMode="numeric"
                  value={values.rental_full_days}
                  disabled={busy}
                  onChange={(e) => set('rental_full_days', e.target.value)}
                  className="font-mono tabular-nums"
                  {...invalid('rental_full_days')}
                />
                {err('rental_full_days')}
                <p className="text-xs text-muted-foreground">{t('pricing.form.fullDaysHint')}</p>
              </div>
            )}
          </div>
        )}
      </fieldset>

      <div className="grid content-start gap-1.5">
        <Label htmlFor="rule-notes">
          {t('pricing.form.notes')}{' '}
          <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
        </Label>
        <Textarea
          id="rule-notes"
          rows={2}
          dir="auto"
          value={values.notes}
          disabled={busy}
          placeholder={t('pricing.form.notesPlaceholder')}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      {submitted && hasErrors(errors) && (
        <p role="alert" className="text-sm text-destructive">
          {t('pricing.form.fixErrors')}
        </p>
      )}

      <DialogFooter className="gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? t('common.saving') : t('pricing.form.save', { date: formatDay(values.effective_from, i18n.language) })}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SavedView({
  company,
  saved,
  onClose,
  onReprice,
}: {
  company: string;
  saved: Saved;
  onClose: () => void;
  onReprice: () => void;
}) {
  const { t, i18n } = useTranslation();
  const date = formatDay(saved.effectiveFrom, i18n.language);
  return (
    <div className="space-y-4" data-testid="pricing-rule-saved">
      <div className="flex items-start gap-3 rounded-md border border-success/40 bg-success/10 px-3 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <p>{t('pricing.form.savedBody', { company, date })}</p>
      </div>
      {saved.unrepriced > 0 ? (
        <p className="text-sm">
          {t('pricing.form.unrepriced', {
            count: saved.unrepriced,
            n: formatNumber(saved.unrepriced, 0),
            date,
          })}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t('pricing.form.nothingToReprice')}</p>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
        {saved.unrepriced > 0 && (
          <Button onClick={onReprice}>
            <RefreshCw />
            {t('pricing.form.repriceFrom', { date })}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

function Suffixed({ suffix, children }: { suffix: string; children: React.ReactNode }) {
  return (
    <div className="relative sm:w-64">
      {children}
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

function Hint({ tone, children }: { tone: 'info' | 'warning'; children: React.ReactNode }) {
  return (
    <p
      className={
        tone === 'warning'
          ? 'flex items-start gap-1.5 text-xs text-warning'
          : 'flex items-start gap-1.5 text-xs text-muted-foreground'
      }
    >
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
