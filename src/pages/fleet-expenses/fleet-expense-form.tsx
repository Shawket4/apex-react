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
import { Switch } from '@/shared/ui/switch';
import { TransactionNotes } from '@/widgets/fleet-expenses-table/transaction-notes';
import { Skeleton } from '@/shared/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { formatCurrency, fmtDate, toDateOnly } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

import {
  useCreateTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/entities/transaction/queries';
import {
  COMPANIES,
  EXPENSE_TYPES,
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
  }, [existing.data, mode, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (mode === 'create') {
      createMutation.mutate(values, {
        onSuccess: () => navigate('/fleet-expenses'),
      });
      return;
    }
    if (!id || !existing.data) return;

    updateMutation.mutate(
      // The version is the optimistic-concurrency token. Sending the one we
      // loaded means a concurrent edit is rejected with 409 rather than
      // silently overwritten.
      { id, version: existing.data.version, values },
      { onSuccess: () => navigate('/fleet-expenses') },
    );
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const row = existing.data;

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

      {/* Verification is the "complete it" action the ntfy push asks for, so it
          sits above the form rather than buried at the bottom. */}
      {mode === 'edit' && row && row.editable !== false && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {/* min-w-0 lets the text block shrink below its content width;
                without it the label pushes the card past a 375px viewport. */}
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <CheckCircle2
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  row.verified ? 'text-emerald-500' : 'text-muted-foreground',
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('fleetExpenses.verifyTitle')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('fleetExpenses.verifyHint')}
                </p>
              </div>
            </div>
            <Switch
              className="shrink-0"
              checked={row.verified}
              onCheckedChange={(checked) =>
                updateMutation.mutate({
                  id: row.id,
                  version: row.version,
                  values: { verified: checked },
                })
              }
            />
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
              <ControlledSelect
                value={form.watch('category') ?? ''}
                onChange={(v) => form.setValue('category', v, { shouldDirty: true })}
                options={EXPENSE_TYPES}
                placeholder={t('fleetExpenses.fields.expenseType')}
              />
            </Field>

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

            <Field
              label={t('fleetExpenses.fields.car')}
              error={form.formState.errors.car_no_plate}
            >
              <Input {...form.register('car_no_plate')} placeholder="ف ج م 8567" />
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

      {/* Where the ntfy deep link lands: "tap to add a note or correct it". */}
      {mode === 'edit' && id && <TransactionNotes transactionId={id} canEdit />}
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
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  const { t } = useTranslation();
  return (
    <Select
      value={value === '' ? UNSET : value}
      onValueChange={(v) => onChange(v === UNSET ? '' : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNSET}>{t('common.none')}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
