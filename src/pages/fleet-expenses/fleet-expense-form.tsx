import * as React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Copy, Loader2, Lock, Receipt, Save, Split, Trash2 } from 'lucide-react';

import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent } from '@/shared/ui/card';
import { NativeSelect } from '@/shared/ui/native-select';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from '@/shared/ui/toaster';
import { cn } from '@/shared/lib/cn';
import { formatMoney, trimMoney } from '@/shared/lib/money';
import {
  cairoDateInput,
  cairoTimeInput,
  formatCairoDate,
  formatCairoDateTime,
} from '@/shared/lib/cairo';
import { SmartPartyField, type PartyValue } from '@/widgets/fleet-expenses-table/party-picker';
import { SplitEditor } from '@/widgets/fleet-expenses-table/split-editor';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import { useVehicles } from '@/entities/transaction/vehicles';
import {
  categoryLabel,
  posts,
  requiresParty,
  useCategories,
  useParties,
  type Category,
  type PartyKind,
} from '@/entities/transaction/categories';
import { useMessage } from '@/entities/raw-message/queries';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/entities/transaction/queries';
import {
  COMPANIES,
  PAYMENT_METHODS,
  isSplitChild,
  splitEligible,
  transactionFormSchema,
  type TransactionFormValues,
} from '@/entities/transaction/schemas';

/**
 * Shared create/edit form. `/fleet-expenses/{id}/edit` is the ntfy deep-link
 * target and keeps its URL.
 *
 * Two panels: the editable fields, and — for whatsapp rows or a message being
 * promoted — the verbatim source message. The party field ("to whom") renders
 * only when the selected category's `required_party` says so, and saving a
 * posting category registers the loan server-side in the same PATCH/POST.
 *
 * Amounts are STRINGS: a text input with inputmode="decimal", submitted
 * verbatim. Never prefilled during promotion — guessing money is the one
 * thing this system refuses to do; tap-to-copy on the body replaces retyping.
 */
export default function FleetExpenseFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isDesktop = useIsDesktop();

  const id = params.id ? Number(params.id) : undefined;
  const rawMessageIdParam = searchParams.get('raw_message_id');
  const rawMessageId =
    mode === 'create' && rawMessageIdParam ? Number(rawMessageIdParam) || undefined : undefined;

  const existing = useTransaction(mode === 'edit' ? id : undefined);
  // Fetched by id so a refresh of the promotion form survives.
  const message = useMessage(rawMessageId);
  const categories = useCategories();
  const vehicles = useVehicles();
  const parties = useParties();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  // Party and vehicle live outside react-hook-form: ids with rules, not text.
  const [party, setParty] = React.useState<PartyValue>({ driver_id: null, employee_id: null });
  const [carId, setCarId] = React.useState<number | null>(null);
  const [partyMissing, setPartyMissing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [splitOpen, setSplitOpen] = React.useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: '',
      currency: 'EGP',
      direction: 'out',
      occurred_date: cairoDateInput(new Date()),
      occurred_time: cairoTimeInput(new Date()),
      category: '',
      account: '',
      counterparty: '',
      reference: '',
      description: '',
      payment_method: '',
      company: '',
      paid_by: '',
    },
  });

  /* ── Populate: edit row ── */
  React.useEffect(() => {
    const row = existing.data;
    if (mode !== 'edit' || !row) return;
    form.reset({
      amount: trimMoney(row.amount),
      currency: row.currency ?? 'EGP',
      direction: row.direction === 'in' ? 'in' : 'out',
      occurred_date: cairoDateInput(row.occurred_at),
      occurred_time: cairoTimeInput(row.occurred_at),
      category: row.category ?? '',
      account: row.account ?? '',
      counterparty: row.counterparty ?? '',
      reference: row.reference ?? '',
      description: row.description ?? '',
      payment_method: row.payment_method ?? '',
      company: row.company ?? '',
      paid_by: row.paid_by ?? '',
    });
    setParty({ driver_id: row.driver_id ?? null, employee_id: row.employee_id ?? null });
    setCarId(row.car_id ?? null);
  }, [existing.data, mode, form]);

  /* ── Populate: promotion — date/time from the envelope, direction out,
        currency EGP, all visibly editable. NEVER the amount. ── */
  React.useEffect(() => {
    const msg = message.data;
    if (mode !== 'create' || !msg || form.formState.isDirty) return;
    form.reset({
      ...form.getValues(),
      direction: 'out',
      currency: 'EGP',
      occurred_date: cairoDateInput(msg.wa_timestamp),
      occurred_time: cairoTimeInput(msg.wa_timestamp),
    });
  }, [message.data, mode, form]);

  const row = existing.data;
  const readOnly = mode === 'edit' && row ? !row.editable : false;

  /* ── Split state of this row ──
     A child's money fields are owned by the split: amount, direction and
     date/time are set server-side and any PATCH touching them is a 400, so
     they render disabled with a pointer to the editor. Category, person and
     description stay editable as normal. An unsplit cash-out row instead
     gets a "Split" action next to Delete. */
  const splitChild = mode === 'edit' && !!row && isSplitChild(row);
  const canSplit = mode === 'edit' && !!row && !readOnly && splitEligible(row);
  const moneyLocked = readOnly || splitChild;

  const catKey = form.watch('category');
  const selectedCategory: Category | undefined = React.useMemo(
    () => categories.data?.find((c) => c.key === catKey),
    [categories.data, catKey],
  );
  const needsParty = requiresParty(selectedCategory);
  const willPost = posts(selectedCategory);
  const hasParty = !!party.driver_id || !!party.employee_id;

  // The history suggestion keys off the counterparty text. Debounced so
  // typing in the field doesn't fire a lookup per keystroke, and disabled
  // entirely when the row already names a person — no second-guessing.
  const suggestCounterparty = useDebounce(form.watch('counterparty') ?? '', 300);
  const suggestParty =
    mode === 'create' || !(existing.data?.driver_id || existing.data?.employee_id);

  React.useEffect(() => {
    if (hasParty || !needsParty) setPartyMissing(false);
  }, [hasParty, needsParty]);

  /* ── Save → history.back() when we came from the ledger/messages list
        (query cache + scroll restoration); deep-link entries go to the ledger. ── */
  const cameFrom = (location.state as { from?: string } | null)?.from;
  const finish = React.useCallback(() => {
    if (cameFrom) navigate(-1);
    else navigate('/fleet-expenses');
  }, [cameFrom, navigate]);

  const onSubmit = form.handleSubmit((values) => {
    if (needsParty && !hasParty) {
      setPartyMissing(true);
      return;
    }
    const partyFields = needsParty
      ? { driver_id: party.driver_id, employee_id: party.employee_id }
      : { driver_id: null, employee_id: null };

    if (mode === 'create') {
      createMutation.mutate(
        {
          ...values,
          car_id: carId,
          ...(needsParty
            ? { driver_id: party.driver_id ?? undefined, employee_id: party.employee_id ?? undefined }
            : {}),
          ...(rawMessageId ? { raw_message_id: rawMessageId } : {}),
        },
        { onSuccess: finish },
      );
      return;
    }
    if (!id || !row) return;
    // A split child's money fields belong to the set — the server 400s any
    // PATCH that carries them, so they are stripped rather than echoed back.
    const patchValues: Partial<TransactionFormValues> = { ...values };
    if (splitChild) {
      delete patchValues.amount;
      delete patchValues.direction;
      delete patchValues.occurred_date;
      delete patchValues.occurred_time;
    }
    updateMutation.mutate(
      {
        id,
        // The version we loaded is the If-Match token — a concurrent edit is
        // rejected with 409 rather than silently overwritten.
        version: row.version,
        values: { ...patchValues, car_id: carId, ...partyFields },
      },
      { onSuccess: finish },
    );
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const partyName = React.useMemo(() => {
    if (!row) return '';
    const list = parties.data ?? [];
    if (row.driver_id) return list.find((p) => p.kind === 'driver' && p.id === row.driver_id)?.name ?? '';
    if (row.employee_id)
      return list.find((p) => p.kind === 'employee' && p.id === row.employee_id)?.name ?? '';
    return row.counterparty ?? '';
  }, [row, parties.data]);

  const copyBody = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('fleetExpenses.copied'));
    } catch {
      toast.error(t('fleetExpenses.copyFailed'));
    }
  };

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

  const sourceBody = mode === 'edit' ? row?.raw_body : message.data?.body;
  const sourceStamp = mode === 'edit' ? row?.raw_wa_timestamp : message.data?.wa_timestamp;
  const showSource = mode === 'edit' ? row?.source === 'whatsapp' && !!sourceBody : !!rawMessageId;

  return (
    <PageShell
      title={
        mode === 'create'
          ? t('fleetExpenses.addExpense')
          : t('fleetExpenses.transactionTitle', { id })
      }
      description={t('fleetExpenses.formSubtitle')}
      icon={<Receipt className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={finish}>
          <ArrowLeft className="rtl:rotate-180" />
          {t('common.back')}
        </Button>
      }
    >
      <div className="grid items-start gap-3 lg:grid-cols-3">
        {/* ── Side panel: the verbatim source message + row facts.
              First in the DOM so it pins ABOVE the form on phones. ── */}
        <div className="space-y-3 lg:order-2">
          {showSource && (
            <div className="rounded-lg border border-s-4 border-s-primary bg-muted/40 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>
                  {t('fleetExpenses.sourceMessage')}
                  {mode === 'edit' && row?.raw_message_id ? ` · #${row.raw_message_id}` : ''}
                  {mode === 'create' && rawMessageId ? ` · #${rawMessageId}` : ''}
                </span>
                {sourceStamp && (
                  <span className="font-medium normal-case tracking-normal">
                    {formatCairoDateTime(sourceStamp, i18n.language)}
                  </span>
                )}
              </div>
              {message.isLoading && mode === 'create' ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <button
                  type="button"
                  onClick={() => sourceBody && void copyBody(sourceBody)}
                  className="w-full rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={t('fleetExpenses.tapToCopy')}
                >
                  <p
                    dir="auto"
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
                  >
                    {sourceBody}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Copy className="h-3 w-3" />
                    {t('fleetExpenses.tapToCopy')}
                  </span>
                </button>
              )}
              {mode === 'create' && (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  {t('fleetExpenses.promoteAmountHint')}
                </p>
              )}
            </div>
          )}

          {mode === 'edit' && row?.edited_by && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              {t('fleetExpenses.editedBy', {
                name: row.edited_by,
                date: row.edited_at ? formatCairoDate(row.edited_at, i18n.language) : '',
              })}
            </div>
          )}

          {/* Fuel events and loans are owned by other pipelines; an edit here
              would be discarded by their next sync. */}
          {readOnly && (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('fleetExpenses.readOnlyExplain')}</span>
            </div>
          )}
        </div>

        {/* ── The form ── */}
        <form onSubmit={onSubmit} className="space-y-3 lg:order-1 lg:col-span-2">
          <Card>
            <CardContent className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
              {/* A split child's money fields belong to the set as a whole. */}
              {splitChild && (
                <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm sm:col-span-2">
                  <Split className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p>{t('fleetExpenses.split.childHint')}</p>
                    {row?.parent_amount != null && (
                      <p className="font-mono text-xs tabular-nums text-muted-foreground" dir="auto">
                        {t('fleetExpenses.split.chipPartOf', {
                          amount: formatMoney(row.parent_amount),
                        })}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 w-full sm:min-h-8 sm:w-auto"
                    onClick={() => setSplitOpen(true)}
                  >
                    {t('fleetExpenses.split.editSplit')}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <Field
                  id="fe-amount"
                  label={t('fleetExpenses.fields.amount')}
                  error={form.formState.errors.amount}
                >
                  <Input
                    id="fe-amount"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder={t('fleetExpenses.amountPlaceholder', { defaultValue: '0.00…' })}
                    autoComplete="off"
                    autoFocus={mode === 'create' && isDesktop}
                    disabled={moneyLocked}
                    {...form.register('amount')}
                  />
                </Field>
                <Field
                  id="fe-currency"
                  label={t('fleetExpenses.fields.currency')}
                  error={form.formState.errors.currency}
                >
                  <Input
                    id="fe-currency"
                    dir="ltr"
                    maxLength={3}
                    autoComplete="off"
                    disabled={readOnly}
                    {...form.register('currency')}
                  />
                </Field>
              </div>

              {/* Direction stays editable — flipping to "out" here is the same
                  reclassification the cash-in pocket offers. Creation defaults
                  to 'out'; promotions force it. */}
              <Field labelId="fe-direction-label" label={t('fleetExpenses.fields.direction')}>
                <div
                  role="group"
                  aria-labelledby="fe-direction-label"
                  className="flex h-11 overflow-hidden rounded-md border sm:h-9"
                >
                  {(['out', 'in'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={moneyLocked}
                      aria-pressed={form.watch('direction') === d}
                      onClick={() => form.setValue('direction', d, { shouldDirty: true })}
                      className={cn(
                        'flex-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        form.watch('direction') === d
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {t(`fleetExpenses.direction.${d}`)}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                id="fe-date"
                label={t('fleetExpenses.fields.date')}
                error={form.formState.errors.occurred_date}
              >
                <Input id="fe-date" type="date" disabled={moneyLocked} {...form.register('occurred_date')} />
              </Field>
              <Field id="fe-time" label={t('fleetExpenses.fields.time')}>
                <Input id="fe-time" type="time" disabled={moneyLocked} {...form.register('occurred_time')} />
              </Field>

              <Field
                id="fe-category"
                label={t('fleetExpenses.fields.expenseType')}
                error={form.formState.errors.category}
              >
                {categories.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <NativeSelect
                    id="fe-category"
                    value={form.watch('category') ?? ''}
                    disabled={readOnly}
                    onChange={(e) =>
                      form.setValue('category', e.target.value, { shouldDirty: true })
                    }
                  >
                    <option value="">{t('common.none')}</option>
                    {(categories.data ?? []).map((c) => (
                      <option key={c.key} value={c.key}>
                        {categoryLabel(c, i18n.language)}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>

              {/* Rendered from the category's own requirements: adding a
                  category that needs a person is a database row, not a code
                  change here. */}
              {needsParty && (
                <Field label={t('fleetExpenses.toWhom')}>
                  <SmartPartyField
                    counterparty={suggestCounterparty}
                    suggest={suggestParty}
                    value={party}
                    onChange={setParty}
                    disabled={readOnly}
                    required={(selectedCategory?.required_party ?? 'either') as PartyKind}
                  />
                  {partyMissing && (
                    <p className="text-[11px] font-medium text-destructive">{t('fleetExpenses.partyRequired')}</p>
                  )}
                  {willPost && !row?.loan && (
                    <p className="text-xs text-muted-foreground">
                      {t('fleetExpenses.party.postsNow')}
                    </p>
                  )}
                </Field>
              )}

              {/* The registration chip says what happened, in words. One-way:
                  it links nowhere the user can break. */}
              {mode === 'edit' && row?.loan && (
                <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2.5 text-sm sm:col-span-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <div>
                    <span dir="auto">
                      {t('fleetExpenses.loanChip', {
                        kind: t(`fleetExpenses.loanKind.${row.loan.kind}`, row.loan.kind),
                        name: partyName,
                        status: t(
                          `fleetExpenses.loanStatus.${row.loan.is_paid ? 'paid' : 'unpaid'}`,
                        ),
                      })}
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.loan.is_paid
                        ? t('fleetExpenses.loanSettledNote')
                        : t('fleetExpenses.loanSyncNote')}
                    </p>
                  </div>
                </div>
              )}

              <Field
                id="fe-counterparty"
                label={t('fleetExpenses.fields.counterparty')}
                error={form.formState.errors.counterparty}
              >
                <Input
                  id="fe-counterparty"
                  dir="auto"
                  autoComplete="off"
                  disabled={readOnly}
                  {...form.register('counterparty')}
                />
              </Field>

              <Field
                id="fe-reference"
                label={t('fleetExpenses.fields.reference')}
                error={form.formState.errors.reference}
              >
                <Input
                  id="fe-reference"
                  dir="ltr"
                  autoComplete="off"
                  disabled={readOnly}
                  {...form.register('reference')}
                />
              </Field>

              <Field
                id="fe-account"
                label={t('fleetExpenses.fields.account')}
                error={form.formState.errors.account}
              >
                <Input
                  id="fe-account"
                  dir="ltr"
                  autoComplete="off"
                  disabled={readOnly}
                  {...form.register('account')}
                />
              </Field>

              <Field id="fe-payment-method" label={t('fleetExpenses.fields.paymentMethod')}>
                <NativeSelect
                  id="fe-payment-method"
                  value={form.watch('payment_method') ?? ''}
                  disabled={readOnly}
                  onChange={(e) =>
                    form.setValue('payment_method', e.target.value, { shouldDirty: true })
                  }
                >
                  <option value="">{t('common.none')}</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field id="fe-company" label={t('fleetExpenses.fields.company')}>
                <NativeSelect
                  id="fe-company"
                  value={form.watch('company') ?? ''}
                  disabled={readOnly}
                  onChange={(e) => form.setValue('company', e.target.value, { shouldDirty: true })}
                >
                  <option value="">{t('common.none')}</option>
                  {COMPANIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field id="fe-car" label={t('fleetExpenses.fields.car')}>
                {vehicles.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <NativeSelect
                    id="fe-car"
                    value={carId == null ? '' : String(carId)}
                    disabled={readOnly}
                    onChange={(e) => setCarId(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <option value="">{t('common.none')}</option>
                    {(vehicles.data ?? []).map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.car_no_plate}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>

              <Field
                id="fe-paid-by"
                label={t('fleetExpenses.fields.paidBy')}
                error={form.formState.errors.paid_by}
              >
                {/* Free text with name suggestions. Picking a driver or an
                    employee here appends their NAME only — deliberately not an
                    id link. Salary settlements are labels, not registrations,
                    and an unregistered name needs no creating to be typed. */}
                <Input
                  id="fe-paid-by"
                  dir="auto"
                  autoComplete="off"
                  disabled={readOnly}
                  list="party-name-suggestions"
                  {...form.register('paid_by')}
                />
                <datalist id="party-name-suggestions">
                  {(parties.data ?? []).map((p) => (
                    <option key={`${p.kind}-${p.id}`} value={p.name} />
                  ))}
                </datalist>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  id="fe-description"
                  label={t('fleetExpenses.fields.description')}
                  error={form.formState.errors.description}
                >
                  <Textarea
                    id="fe-description"
                    rows={3}
                    dir="auto"
                    autoComplete="off"
                    disabled={readOnly}
                    {...form.register('description')}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {!readOnly && (
            /* On phones the actions pin to the bottom of the viewport (with
               iOS safe-area padding) so Save never scrolls out of reach; from
               sm up they sit statically under the card as before. */
            <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:mx-0 sm:flex-nowrap sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
              <Button
                type="button"
                variant="outline"
                onClick={finish}
                className="order-1 min-h-11 flex-1 sm:order-2 sm:min-h-9 sm:flex-none"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="order-2 min-h-11 flex-1 sm:order-3 sm:min-h-9 sm:flex-none"
              >
                {saving ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <Save />
                )}
                {saving ? t('common.saving') : t('common.save')}
              </Button>
              {mode === 'edit' && row && !splitChild && (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'order-3 min-h-10 w-full text-destructive hover:text-destructive sm:order-1 sm:min-h-9 sm:w-auto',
                    !canSplit && 'sm:me-auto',
                  )}
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || deleteMutation.isPending}
                >
                  <Trash2 />
                  {t('common.delete')}
                </Button>
              )}
              {/* Splitting an unsplit cash-out row — sits with Delete because
                  both replace this screen's row with something else. */}
              {canSplit && (
                <Button
                  type="button"
                  variant="ghost"
                  className="order-4 min-h-10 w-full text-muted-foreground sm:order-1 sm:me-auto sm:min-h-9 sm:w-auto"
                  onClick={() => setSplitOpen(true)}
                  disabled={saving || deleteMutation.isPending}
                >
                  <Split />
                  {t('fleetExpenses.split.action')}
                </Button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* One editor for both entry points: splitting THIS row, or editing the
          set THIS row is a part of. Either way the saved result replaces the
          row this screen was loaded around, so onDone leaves the screen. */}
      {mode === 'edit' && (
        <SplitEditor
          open={splitOpen}
          onOpenChange={setSplitOpen}
          row={row ?? null}
          onDone={finish}
          canEdit={!readOnly}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('fleetExpenses.deleteConfirmTitle')}
        description={t('fleetExpenses.deleteConfirmDescription', {
          amount: row ? `${formatMoney(row.amount)} ${row.currency ?? 'EGP'}` : '',
        })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => {
          if (!id || !row) return;
          deleteMutation.mutate(
            { id, version: row.version },
            {
              onSuccess: () => {
                setConfirmDelete(false);
                navigate('/fleet-expenses');
              },
              onError: () => setConfirmDelete(false),
            },
          );
        }}
      />
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  id,
  labelId,
  label,
  error,
  children,
}: {
  id?: string;
  labelId?: string;
  label: string;
  error?: { message?: string };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} id={labelId}>
        {label}
      </Label>
      {children}
      {error?.message && <p className="text-[11px] font-medium text-destructive">{error.message}</p>}
    </div>
  );
}
