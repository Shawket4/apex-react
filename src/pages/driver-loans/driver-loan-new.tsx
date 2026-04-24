
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
      icon={<CreditCard className="h-5 w-5" />}
      actions={
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </Button>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <DollarSign className="mr-1 inline h-3.5 w-3.5" />
                    {t('driverLoans.fields.amount')} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
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
                    <Calendar className="mr-1 inline h-3.5 w-3.5" />
                    {t('driverLoans.fields.date')} *
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
                  <CreditCard className="mr-1 inline h-3.5 w-3.5" />
                  {t('driverLoans.fields.method')} *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('driverLoans.fields.methodPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={goBack} disabled={addMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {addMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </PageShell>
  );
}
