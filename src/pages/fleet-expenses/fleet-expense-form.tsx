import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Receipt, Save, CheckCircle2, Lock } from 'lucide-react';

import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent } from '@/shared/ui/card';
import { PartyPicker } from '@/widgets/fleet-expenses-table/party-picker';
import { useVehicles } from '@/entities/transaction/vehicles';
import {
  useCategories,
  requiresParty,
  posts,
  type Category,
} from '@/entities/transaction/categories';
import { Skeleton } from '@/shared/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { formatCurrency, fmtDate, toDateOnly } from '@/shared/lib/format';

import {
  useCreateTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/entities/transaction/queries';
import {
  COMPANIES,
  PAYMENT_METHODS,
  expenseFormSchema,
  type ExpenseFormValues,
} from '@/entities/transaction/schemas';

/**
 * Shared create/edit form.
 *
 * Writes always target `banksms.transactions` through apex-rust. Creating a row
 * here produces `source: 'manual'`; editing a row that came from a bank SMS
 * records an OVERRIDE rather than mutating the parsed value, so the original
 * reading survives and is shown back to the user.
 */
export default function FleetExpenseFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : undefined;

  const existing = useTransaction(mode === 'edit' ? id : undefined);
  const categories = useCategories();
  const vehicles = useVehicles();

  // Party lives outside react-hook-form: it is two ids with a mutual-exclusion
  // rule, and modelling that as form fields buys nothing.
  const [party, setParty] = React.useState<{ driver_id: number | null; employee_id: number | null }>(
    { driver_id: null, employee_id: null },
  );

  // Category and party are held outside react-hook-form. Both are select-driven
  // values that were never registered as inputs, and reading them back through
  // watch() after reset() proved unreliable -- the category of every edited row
  // silently rendered as unset. Explicit state is one less thing to reason about.
  const [category, setCategory] = React.useState('');
  // Vehicle is stored by id; the plate shown is derived from it.
  const [carId, setCarId] = React.useState<number | null>(null);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      currency: 'EGP',
      direction: 'out',
      occurred_at: toDateOnly(new Date()),
      category: '',
      description: '',
      payment_method: 'Cash',
      company: '',
      car_no_plate: '',
      paid_by: '',
      counterparty: '',
    },
  });

  // Populate once the row arrives. `reset` rather than per-field setValue so
  // dirty-state stays meaningful.
  React.useEffect(() => {
    const row = existing.data;
    if (mode !== 'edit' || !row) return;
    form.reset({
      amount: row.amount ?? 0,
      currency: row.currency ?? 'EGP',
      direction: (row.direction as 'in' | 'out') ?? 'out',
      occurred_at: toDateOnly(row.occurred_at ?? row.created_at),
      category: row.category ?? '',
      description: row.description ?? '',
      payment_method: row.payment_method ?? '',
      company: row.company ?? '',
      car_no_plate: row.car_no_plate ?? '',
      paid_by: row.paid_by ?? '',
      counterparty: row.counterparty ?? '',
    });
    setCategory(row.category ?? '');
    setCarId(row.car_id ?? null);
    setParty({
      driver_id: row.driver_id ?? null,
      employee_id: row.employee_id ?? null,
    });
  }, [existing.data, mode, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (mode === 'create') {
      createMutation.mutate({ ...values, category, car_id: carId }, {
        onSuccess: () => navigate('/fleet-expenses'),
      });
      return;
    }
    if (!id || !existing.data) return;

    updateMutation.mutate(
      // The version is the optimistic-concurrency token. Sending the one we
      // loaded means a concurrent edit is rejected with 409 rather than
      // silently overwritten.
      {
        id,
        version: existing.data.version,
        values: {
          ...values,
          category,
          car_id: carId,
          driver_id: party.driver_id,
          employee_id: party.employee_id,
        },
      },
      { onSuccess: () => navigate('/fleet-expenses') },
    );
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const row = existing.data;

  const selectedCategory: Category | undefined = React.useMemo(
    () => categories.data?.find((c) => c.key === category),
    [categories.data, category],
  );
  const needsParty = requiresParty(selectedCategory);
  const willPost = posts(selectedCategory);
  const partyMissing = needsParty && !party.driver_id && !party.employee_id;

  if (mode === 'edit' && existing.isLoading) {
    return (
      <PageShell title={t('fleetExpenses.editExpense')}>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={mode === 'create' ? t('fleetExpenses.addExpense') : t('fleetExpenses.editExpense')}
      description={t('fleetExpenses.formSubtitle')}
      icon={<Receipt className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate('/fleet-expenses')}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
      }
    >
      {/* When editing a parsed row, show what the SMS actually said. Without
          this the user has no way to tell an original value from a correction. */}
      {mode === 'edit' && row?.source === 'whatsapp' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="space-y-1 py-3 text-sm">
            <div className="font-medium">{t('fleetExpenses.originalReading')}</div>
            <div className="text-muted-foreground">
              {row.parsed?.amount != null && (
                <span className="me-3">{formatCurrency(row.parsed.amount)}</span>
              )}
              {row.parsed?.counterparty && (
                <span className="me-3">{row.parsed.counterparty}</span>
              )}
              {row.parsed?.occurred_at && <span>{fmtDate(row.parsed.occurred_at)}</span>}
            </div>
            {row.parsed?.template && (
              <div className="text-xs text-muted-foreground">
                {t('fleetExpenses.parsedByTemplate', { template: row.parsed.template })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fuel events and loans are owned by other pipelines; an edit here would
          be discarded by their next sync. */}
      {mode === 'edit' && row?.editable === false && (
        <Card className="border-muted">
          <CardContent className="flex items-start gap-2 py-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('fleetExpenses.readOnlyExplain')}</span>
          </CardContent>
        </Card>
      )}


      {/* A posting category now takes effect as soon as a person is chosen.
          There used to be a "mark as verified" switch here gating that, but a
          tier-1 template match already establishes the parse is right -- the
          pattern either matched the bank's message or it did not -- so the
          click confirmed nothing the parser had not already determined. */}
      {mode === 'edit' && willPost && !partyMissing && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-start gap-2 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{t('fleetExpenses.party.postsNow')}</span>
          </CardContent>
        </Card>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
            <Field label={t('fleetExpenses.fields.amount')} error={form.formState.errors.amount}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register('amount')}
                autoFocus={mode === 'create'}
              />
            </Field>

            <Field label={t('fleetExpenses.fields.date')} error={form.formState.errors.occurred_at}>
              <Input type="date" {...form.register('occurred_at')} />
            </Field>

            <Field
              label={t('fleetExpenses.fields.expenseType')}
              error={form.formState.errors.category}
            >
              {/*
                Rendered only once the options exist. A Radix Select whose value
                is set by form.reset() before its items have loaded has nothing
                to match against and falls back to the unset option, which
                silently blanked the category of every row being edited.
              */}
              {categories.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <ControlledSelect
                  value={category}
                  onChange={setCategory}
                  options={(categories.data ?? []).map((c) => c.key)}
                  labels={Object.fromEntries(
                    (categories.data ?? []).map((c) => [c.key, c.label]),
                  )}
                  placeholder={t('fleetExpenses.fields.expenseType')}
                />
              )}
            </Field>

            {/* Rendered from the category's own requirements, so adding a
                category that needs a person is a row in the database rather
                than a change here. */}
            {needsParty && (
              <Field label={t('fleetExpenses.party.label')}>
                <PartyPicker
                  value={party}
                  onChange={setParty}
                  required={(selectedCategory?.required_party ?? 'either') as never}
                />
                {willPost && (
                  <p className="text-xs text-muted-foreground">
                    {t('fleetExpenses.party.willPost')}
                  </p>
                )}
              </Field>
            )}

            <Field
              label={t('fleetExpenses.fields.paymentMethod')}
              error={form.formState.errors.payment_method}
            >
              <ControlledSelect
                value={form.watch('payment_method') ?? ''}
                onChange={(v) => form.setValue('payment_method', v, { shouldDirty: true })}
                options={PAYMENT_METHODS}
                placeholder={t('fleetExpenses.fields.paymentMethod')}
              />
            </Field>

            <Field label={t('fleetExpenses.fields.company')} error={form.formState.errors.company}>
              <ControlledSelect
                value={form.watch('company') ?? ''}
                onChange={(v) => form.setValue('company', v, { shouldDirty: true })}
                options={COMPANIES}
                placeholder={t('fleetExpenses.fields.company')}
              />
            </Field>

            <Field label={t('fleetExpenses.fields.car')}>
              {vehicles.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <ControlledSelect
                  value={carId == null ? '' : String(carId)}
                  onChange={(v) => setCarId(v === '' ? null : Number(v))}
                  options={(vehicles.data ?? []).map((v) => String(v.id))}
                  labels={Object.fromEntries(
                    (vehicles.data ?? []).map((v) => [String(v.id), v.plate]),
                  )}
                  placeholder={t('fleetExpenses.fields.car')}
                />
              )}
            </Field>

            <Field label={t('fleetExpenses.fields.paidBy')} error={form.formState.errors.paid_by}>
              <Input {...form.register('paid_by')} />
            </Field>

            <Field
              label={t('fleetExpenses.fields.counterparty')}
              error={form.formState.errors.counterparty}
            >
              <Input {...form.register('counterparty')} />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label={t('fleetExpenses.fields.description')}
                error={form.formState.errors.description}
              >
                <Textarea rows={3} {...form.register('description')} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/fleet-expenses')}
            className="w-full sm:w-auto"
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: { message?: string };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error?.message && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}

/**
 * Radix Select cannot hold an empty string as a value, so an "unset" option is
 * represented by a sentinel and mapped back to `''` on the way out.
 */
const UNSET = '__unset__';

function ControlledSelect({
  value,
  onChange,
  options,
  placeholder,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
  /** Display text per option value. Falls back to the value itself. */
  labels?: Record<string, string>;
}) {
  const { t } = useTranslation();
  return (
    <Select
      value={value === '' ? UNSET : value}
      onValueChange={(v) => {
        // Radix emits an empty string when its controlled value matches none of
        // its MOUNTED items -- and items only mount once the menu is opened. So
        // a value restored from the server triggers a spurious "" before the
        // user has touched anything, which previously wiped it.
        //
        // An empty string is never a real selection here: the unset choice is
        // the UNSET sentinel. Ignoring "" is therefore safe and is what keeps a
        // restored category from being silently cleared.
        if (v === '') return;
        onChange(v === UNSET ? '' : v);
      }}
    >
      <SelectTrigger>
        {/*
          The display text is rendered explicitly rather than left to Radix.
          Radix resolves a SelectValue from its registered SelectItems, and those
          only mount when the dropdown is opened -- so a value restored from the
          server before the user ever opens the menu had nothing to resolve
          against and the trigger showed the unset label instead.
        */}
        <SelectValue placeholder={placeholder}>
          {value === '' ? t('common.none') : (labels?.[value] ?? value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNSET}>{t('common.none')}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels?.[option] ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
