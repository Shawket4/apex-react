import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Loader2,
  Plus,
} from 'lucide-react';
import { 
  serviceInvoiceFormSchema, 
  type ServiceInvoiceFormValues,
  type ServiceInvoice 
} from '@/entities/service-invoice/schemas';
import type { Car } from '@/entities/car/schemas';
import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { DatePicker } from '@/shared/ui/date-picker';
import { Card, CardContent } from '@/shared/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { today } from '@/shared/lib/format';

interface ServiceInvoiceFormProps {
  car?: Car;
  initialValues?: Partial<ServiceInvoice>;
  isEditMode?: boolean;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (values: ServiceInvoiceFormValues) => void;
}

const DEFAULT_ITEMS_COUNT = 15;

export function ServiceInvoiceForm({
  car,
  initialValues,
  isEditMode = false,
  submitting,
  onBack,
  onSubmit,
}: ServiceInvoiceFormProps) {
  const { t } = useTranslation();
  const { data: cars = [] } = useCars();
  const { data: drivers = [] } = useDrivers();

  const form = useForm<ServiceInvoiceFormValues>({
    resolver: zodResolver(serviceInvoiceFormSchema),
    defaultValues: {
      car_id: car?.ID || initialValues?.car_id || 0,
      driver_id: initialValues?.driver_id || null,
      driver_name: initialValues?.driver_name || '',
      date: initialValues?.date?.split('T')[0] || today(),
      meter_reading: initialValues?.meter_reading || 0,
      plate_number: car?.car_no_plate || initialValues?.plate_number || '',
      supervisor: initialValues?.supervisor || '',
      operating_region: initialValues?.operating_region || '',
      inspection_items: initialValues?.inspection_items?.length 
        ? initialValues.inspection_items.map(i => ({ service: i.service, notes: i.notes || '' }))
        : Array(DEFAULT_ITEMS_COUNT).fill({ service: '', notes: '' }),
    },
  });

  const carOptions = React.useMemo(
    () => cars.map((c) => ({ value: c.ID, label: c.car_no_plate })),
    [cars],
  );

  const driverOptions = React.useMemo(
    () => drivers.map((d) => ({ value: d.ID, label: d.name, description: d.mobile_number || undefined })),
    [drivers],
  );

  const watchedCarId = form.watch('car_id');

  React.useEffect(() => {
    if (watchedCarId) {
      const selectedCar = cars.find(c => c.ID === watchedCarId);
      if (selectedCar) {
        form.setValue('plate_number', selectedCar.car_no_plate);
        // Only auto-fill driver from car if we don't already have one, or if we are creating
        if (!isEditMode && selectedCar.driver_id) {
          const matchingDriver = drivers.find(d => d.ID === selectedCar.driver_id);
          if (matchingDriver) {
            form.setValue('driver_id', matchingDriver.ID);
            form.setValue('driver_name', matchingDriver.name);
          }
        }
      }
    }
  }, [watchedCarId, cars, drivers, form, isEditMode]);

  // Fallback for legacy backend records that don't return driver_id yet
  React.useEffect(() => {
    if (isEditMode && initialValues?.driver_name && drivers.length > 0) {
      const currentDriverId = form.getValues('driver_id');
      if (currentDriverId == null) {
        const match = drivers.find(d => d.name === initialValues.driver_name);
        if (match) {
          form.setValue('driver_id', match.ID);
        }
      }
    }
  }, [isEditMode, initialValues?.driver_name, drivers.length, form]);

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'inspection_items',
  });

  const handleAddLines = () => {
    for (let i = 0; i < 5; i++) {
      append({ service: '', notes: '' });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} disabled={submitting} aria-label={t('common.back')}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold leading-tight sm:text-xl">
              {isEditMode ? t('common.edit') : t('serviceInvoices.newInvoice')}
            </h1>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {car?.car_no_plate || initialValues?.plate_number}
              {car?.car_type && ` • ${car.car_type}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pb-20">
          {/* Main Info */}
          <Card className="shadow-none">
            <CardContent className="pt-6">
              <div className="text-center mb-3">
                <h2 className="text-lg font-semibold leading-tight text-foreground">
                  {t('serviceInvoices.form.checklistTitle')}
                </h2>
                <h3 className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('serviceInvoices.form.truckSubtitle')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('serviceInvoices.fields.date')}</FormLabel>
                      <FormControl>
                        <DatePicker 
                          value={field.value} 
                          onChange={field.onChange} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driver_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceInvoices.fields.driver')}</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={driverOptions}
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            const d = drivers.find(drv => drv.ID === Number(v));
                            if (d) {
                              form.setValue('driver_name', d.name);
                            }
                          }}
                          placeholder={t('fuelEvents.fields.selectDriver')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="car_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceInvoices.fields.plateNumber')}</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={carOptions}
                          value={field.value || null}
                          onChange={(v) => field.onChange(v as number)}
                          placeholder={t('fuelEvents.fields.selectCar')}
                          disabled={!!car}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plate_number"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meter_reading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceInvoices.fields.meterReading')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          inputMode="numeric"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceInvoices.fields.supervisor')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operating_region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceInvoices.fields.region')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inspection Items Table */}
          <div className="rounded-lg border overflow-hidden bg-card">
            <div className="bg-muted/60 px-3 py-2 border-b">
              <h3 className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('serviceInvoices.fields.items')}
              </h3>
            </div>
            
            <div className="hidden md:grid grid-cols-[1fr_1fr] border-b bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="p-3 text-center border-e">
                {t('serviceInvoices.fields.notes')}
              </div>
              <div className="p-3 text-center">
                {t('serviceInvoices.fields.service')}
              </div>
            </div>

            <div className="divide-y">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr] group hover:bg-muted/50 transition-colors">
                  <div className="relative border-e-0 md:border-e">
                    <div className="px-4 pt-3 md:hidden text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('serviceInvoices.fields.notes')}
                    </div>
                    <Textarea
                      {...form.register(`inspection_items.${index}.notes` as const)}
                      className="min-h-[60px] md:min-h-[80px] resize-none border-0 rounded-none bg-transparent focus-visible:ring-inset focus-visible:ring-offset-0 px-4 py-3"
                      placeholder={t('serviceInvoices.form.placeholderNotes')}
                    />
                    <div className="absolute top-2 start-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          form.setValue(`inspection_items.${index}.service`, '');
                          form.setValue(`inspection_items.${index}.notes`, '');
                        }}
                        title={t('serviceInvoices.form.clearItem')}
                        aria-label={t('serviceInvoices.form.clearItem')}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:bg-transparent">
                    <div className="px-4 pt-3 md:hidden text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t">
                      {t('serviceInvoices.fields.service')}
                    </div>
                    <Input
                      {...form.register(`inspection_items.${index}.service` as const)}
                      className="h-full border-0 rounded-none bg-transparent focus-visible:ring-inset focus-visible:ring-offset-0 px-4 py-3 font-medium"
                      placeholder={t('serviceInvoices.form.placeholderService', { n: index + 1 })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-muted/40 flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={handleAddLines}>
                <Plus aria-hidden="true" />
                {t('serviceInvoices.form.addLines')}
              </Button>
            </div>
          </div>

          {/* Floating Actions for Mobile */}
          <div className="safe-bottom fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-3 flex gap-2 lg:hidden z-30">
            <Button variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={form.handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
