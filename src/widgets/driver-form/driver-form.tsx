import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, User } from 'lucide-react';
import { driverFormSchema, type Driver, type DriverFormValues } from '@/entities/driver/schemas';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { FormSection } from '@/shared/ui/form-section';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';

interface DriverFormProps {
  /** The driver being edited. Leave out to add a new one. */
  driver?: Driver | null;
  submitting: boolean;
  onSubmit: (values: DriverFormValues) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Who the driver is. Their papers (licence, ID, certificates) and the dates
 * on them are added on the driver's Documents tab, not here.
 */
export function DriverForm({ driver, submitting, onSubmit, onCancel }: DriverFormProps) {
  const { t } = useTranslation();

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: driver?.name ?? '',
      mobile_number: driver?.mobile_number ?? '',
    },
    mode: 'onTouched',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <p className="text-sm text-muted-foreground">{t('drivers.form.onlyNameRequired')}</p>

        <FormSection icon={User} title={t('drivers.sections.personalInfo')}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('drivers.fields.name')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('drivers.fields.namePlaceholder')}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('drivers.fields.phone')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder={t('drivers.fields.phonePlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || (!!driver && !form.formState.isDirty)}>
            {submitting ? <Loader2 className="animate-spin" /> : <Save />}
            {driver ? t('common.save') : t('drivers.addDriver')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
