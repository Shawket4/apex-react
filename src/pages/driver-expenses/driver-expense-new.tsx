
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  Save,
  Receipt,
  DollarSign,
  Calendar,
  Tag,
  CreditCard,
  FileText,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { DatePicker } from '@/shared/ui/date-picker';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useDriver } from '@/entities/driver/queries';
import { useAddDriverExpense } from '@/entities/driver-expense/queries';
import {
  expenseFormSchema,
  type ExpenseFormValues,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/entities/driver-expense/schemas';
import { today } from '@/shared/lib/format';

export default function AddDriverExpensePage() {
  const { id } = useParams<{ id: string }>();
  const driverId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: driver } = useDriver(driverId);
  const addMutation = useAddDriverExpense();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      cost: '' as unknown as number,
      date: today(),
      category: '',
      description: '',
      payment_method: 'Cash',
    },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    addMutation.mutate(
      {
        expense: {
          driver_id: driverId,
          cost: values.cost,
          date: values.date,
          category: values.category || 'Uncategorized',
          description: values.description || '',
          payment_method: values.payment_method || 'Cash',
        },
      },
      {
        onSuccess: () => {
          navigate(`/drivers/${id}/expenses`);
        },
      },
    );
  };

  const goBack = () => navigate(`/drivers/${id}/expenses`);

  return (
    <PageShell
      title={t('driverExpenses.addExpense')}
      description={driver?.name ?? t('common.loading')}
      icon={<Receipt className="h-5 w-5" />}
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
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <DollarSign className="mr-1 inline h-3.5 w-3.5" />
                    {t('driverExpenses.fields.amount')} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
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
                    {t('driverExpenses.fields.date')} *
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

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Tag className="mr-1 inline h-3.5 w-3.5" />
                    {t('driverExpenses.fields.category')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectOne')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <CreditCard className="mr-1 inline h-3.5 w-3.5" />
                    {t('driverExpenses.fields.paymentMethod')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectOne')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description — full width */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <FileText className="mr-1 inline h-3.5 w-3.5" />
                  {t('driverExpenses.fields.description')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder={t('driverExpenses.fields.descriptionPlaceholder')}
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
