import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, User, Calendar } from 'lucide-react';
import {
  driverFormSchema,
  type DriverFormValues,
  type Driver,
} from '@/entities/driver/schemas';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DatePicker } from '@/shared/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';

interface DriverFormProps {
  mode: 'create' | 'edit';
  driver?: Driver | null;
  submitting: boolean;
  onSubmit: (values: DriverFormValues) => void | Promise<void>;
  onCancel?: () => void;
}

function getDefaults(driver?: Driver | null): DriverFormValues {
  return {
    name: driver?.name ?? '',
    mobile_number: driver?.mobile_number ?? '',
    id_license_expiration_date: driver?.id_license_expiration_date ?? '',
    driver_license_expiration_date: driver?.driver_license_expiration_date ?? '',
    safety_license_expiration_date: driver?.safety_license_expiration_date ?? '',
    drug_test_expiration_date: driver?.drug_test_expiration_date ?? '',
  };
}

export function DriverForm({
  mode,
  driver,
  submitting,
  onSubmit,
  onCancel,
}: DriverFormProps) {
  const { t } = useTranslation();

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: getDefaults(driver),
    mode: 'onTouched',
  });

  React.useEffect(() => {
    if (driver) {
      form.reset(getDefaults(driver));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.ID]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              {t('drivers.sections.personalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('drivers.fields.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('drivers.fields.namePlaceholder')}
                      {...field}
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
                  <FormLabel>
                    {t('drivers.fields.phone')}{' '}
                    <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t('drivers.fields.phonePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Licenses & certifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {t('drivers.sections.licenses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="driver_license_expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('drivers.fields.driverLicenseExpiry')}</FormLabel>
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
            <FormField
              control={form.control}
              name="id_license_expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('drivers.fields.idExpiry')}{' '}
                    <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
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
            <FormField
              control={form.control}
              name="safety_license_expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('drivers.fields.safetyExpiry')}</FormLabel>
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
            <FormField
              control={form.control}
              name="drug_test_expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('drivers.fields.drugTestExpiry')}</FormLabel>
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
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitting || (mode === 'edit' && !form.formState.isDirty)}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mode === 'create' ? t('drivers.addDriver') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
