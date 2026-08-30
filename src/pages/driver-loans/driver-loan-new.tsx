
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  Save,
  CreditCard,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DatePicker } from '@/shared/ui/date-picker';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/ui/form';
import { useDriver } from '@/entities/driver/queries';
import { useAddDriverLoan } from '@/entities/driver-loan/queries';
import { loanFormSchema, type LoanFormValues } from '@/entities/driver-loan/schemas';
import { today } from '@/shared/lib/format';

export default function AddDriverLoanPage() {
  const { id } = useParams<{ id: string }>();
  const driverId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: driver } = useDriver(driverId);
  const addMutation = useAddDriverLoan();

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      amount: '' as unknown as number,
      kind: 'advance',
      date: today(),
      method: '',
    },
  });

  const onSubmit = (values: LoanFormValues) => {
    addMutation.mutate(
      {
        driver_id: driverId,
        loan: {
          date: values.date,
          amount: values.amount,
          method: values.method,
          kind: values.kind,
        },
      },
      {
        onSuccess: () => {
          navigate(`/drivers/${id}/loans`);
        },
      },
    );
  };

  const goBack = () => navigate(`/drivers/${id}/loans`);

  return (
    <PageShell
      title={t('driverLoans.addLoan')}
      description={driver?.name ?? t('common.loading')}
      icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
      actions={
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </Button>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-3">
          {/* Type — advance and loan subtract identically; they differ in what
              they mean, so the choice is an explicit toggle, defaulting to
              advance to match the backend's own default. */}
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('driverLoans.fields.kind')} <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <div className="grid max-w-xs grid-cols-2 gap-2">
                    {(['advance', 'loan'] as const).map((k) => (
                      <Button
                        key={k}
                        type="button"
                        className="min-h-11 sm:min-h-9"
                        aria-pressed={field.value === k}
                        variant={field.value === k ? 'default' : 'outline'}
                        onClick={() => field.onChange(k)}
                      >
                        {t(`driverLoans.kindSingular.${k}`)}
                      </Button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <DollarSign className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {t('driverLoans.fields.amount')} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      autoComplete="off"
                      inputMode="decimal"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Calendar className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {t('driverLoans.fields.date')} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      max="2099-12-31"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Method — full width */}
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <CreditCard className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  {t('driverLoans.fields.method')} <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('driverLoans.fields.methodPlaceholder')}
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions — full-width and stacked on phones, inline from sm up. */}
          <div className="flex flex-col-reverse gap-2 border-t pt-4 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={addMutation.isPending}
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={addMutation.isPending}
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
            >
              {addMutation.isPending ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {addMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </PageShell>
  );
}
