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
    () => drivers.map((d) => ({ value: d.name, label: d.name, description: d.mobile_number || undefined })),
    [drivers],
  );

  const watchedCarId = form.watch('car_id');

  React.useEffect(() => {
    if (watchedCarId) {
      const selectedCar = cars.find(c => c.ID === watchedCarId);
      if (selectedCar) {
        form.setValue('plate_number', selectedCar.car_no_plate);
      }
    }
  }, [watchedCarId, cars, form]);

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? t('common.edit') : t('serviceInvoices.newInvoice')}
            </h1>
            <p className="text-sm text-muted-foreground">
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">
          {/* Main Info */}
          <Card className="border-2 border-muted/50 shadow-none">
            <CardContent className="pt-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground">
                  {t('serviceInvoices.form.checklistTitle')}
                </h2>
                <h3 className="text-lg text-muted-foreground uppercase tracking-widest mt-1">
                  {t('serviceInvoices.form.truckSubtitle')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
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
                  name="driver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('serviceInvoices.fields.driver')}</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={driverOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('fuelEvents.fields.selectDriver')}
                          allowCustom
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inspection Items Table */}
          <div className="rounded-xl border-2 border-muted overflow-hidden bg-card">
            <div className="bg-muted/50 p-4 border-b">
              <h3 className="text-center font-bold text-lg">
                {t('serviceInvoices.fields.items')}
              </h3>
            </div>
            
            <div className="grid grid-cols-[1fr_1fr] bg-foreground text-background font-semibold text-sm">
              <div className="p-3 text-center border-e border-background/20">
                {t('serviceInvoices.fields.notes')}
              </div>
              <div className="p-3 text-center">
                {t('serviceInvoices.fields.service')}
              </div>
            </div>

            <div className="divide-y-2 divide-muted">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr] group hover:bg-muted/10 transition-colors">
                  <div className="relative border-e-2 border-muted">
                    <Textarea
                      {...form.register(`inspection_items.${index}.notes` as const)}
                      className="min-h-[60px] resize-none border-0 rounded-none bg-transparent focus-visible:ring-0 px-4 py-3"
                      placeholder={t('serviceInvoices.form.placeholderNotes')}
                    />
                    <div className="absolute top-2 start-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Input
                      {...form.register(`inspection_items.${index}.service` as const)}
                      className="h-full border-0 rounded-none bg-transparent focus-visible:ring-0 px-4 py-3 font-medium"
                      placeholder={t('serviceInvoices.form.placeholderService', { n: index + 1 })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t-2 border-muted bg-muted/5 flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={handleAddLines}>
                <Plus className="h-4 w-4 mr-2" />
                {t('serviceInvoices.form.addLines')}
              </Button>
            </div>
          </div>

          {/* Floating Actions for Mobile */}
          <div className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur-lg border-t p-4 flex gap-3 lg:hidden z-50">
            <Button variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={form.handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
