import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Truck, Calendar, Gauge, Plus, Trash2, User } from 'lucide-react';
import {
  carFormSchema,
  type CarFormValues,
  type Car,
} from '@/entities/car/schemas';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useDrivers } from '@/entities/driver/queries';
import { SearchableSelect } from '@/shared/ui/searchable-select';

interface CarFormProps {
  mode: 'create' | 'edit';
  car?: Car | null;
  submitting: boolean;
  onSubmit: (values: CarFormValues) => void | Promise<void>;
  onCancel?: () => void;
}

function getDefaults(car?: Car | null): any {
  const comps = car?.json_compartments?.length ? car.json_compartments : (car?.compartments?.length ? car.compartments : [0, 0, 0, 0]);
  return {
    car_no_plate: car?.car_no_plate ?? '',
    car_type: car?.car_type ?? 'No Trailer',
    tank_capacity: car?.tank_capacity ?? 0,
    license_expiration_date: car?.license_expiration_date ?? '',
    calibration_expiration_date: car?.calibration_expiration_date ?? '',
    tank_license_expiration_date: car?.tank_license_expiration_date ?? '',
    compartments: comps,
    transporter: car?.transporter ?? 'Apex',
    driver_id: car?.driver_id ?? null,
  };
}

export function CarForm({
  mode,
  car,
  submitting,
  onSubmit,
  onCancel,
}: CarFormProps) {
  const { t } = useTranslation();
  const { data: drivers = [] } = useDrivers();

  const form = useForm<any>({
    resolver: zodResolver(carFormSchema),
    defaultValues: getDefaults(car),
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'compartments',
  });

  const driverOptions = React.useMemo(() => {
    return drivers.map((d) => ({
      value: d.ID,
      label: d.name,
    }));
  }, [drivers]);

  React.useEffect(() => {
    if (car) {
      form.reset(getDefaults(car));
    }
  }, [car?.ID, form]);

  const carType = form.watch('car_type');
  const compartments = form.watch('compartments') || [];
  const totalCapacity = compartments.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);

  // Sync tank_capacity with compartments total
  React.useEffect(() => {
    form.setValue('tank_capacity', totalCapacity);
  }, [totalCapacity, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Truck className="h-4 w-4 text-muted-foreground" />
              {t('cars.sections.vehicleInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="car_no_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cars.fields.plateNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('cars.fields.plateNumberPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="car_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cars.fields.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="No Trailer">{t('cars.types.noTrailer', 'No Trailer')}</SelectItem>
                      <SelectItem value="Trailer">{t('cars.types.trailer', 'Trailer')}</SelectItem>
                      <SelectItem value="Truck">{t('cars.types.truck', 'Truck')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Driver Assignment Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <User className="h-4 w-4 text-muted-foreground" />
              {t('cars.sections.driverAssignment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cars.fields.driver')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={driverOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('cars.fields.selectDriver')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              {t('cars.sections.compartments')}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground">{t('common.total')}:</span>
              <span className="font-mono tabular-nums">{totalCapacity.toLocaleString()} {t('cars.units.litre', 'L')}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fields.map((item, index) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name={`compartments.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t('cars.sections.compartmentIndex', { index: index + 1 })}</FormLabel>
                      <div className="flex gap-1">
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              className="pe-8"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t('cars.units.litre', 'L')}</span>
                          </div>
                        </FormControl>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            aria-label={t('cars.sections.removeCompartment', 'Remove compartment')}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            {fields.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => append(0)}
              >
                <Plus />
                {t('cars.sections.addCompartment', 'Add Compartment')}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {t('cars.sections.licenses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="license_expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cars.fields.licenseExpiry')}</FormLabel>
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
              name="calibration_expiration_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cars.fields.calibrationExpiry')}</FormLabel>
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
            {(carType === 'Trailer' || carType === 'Truck') && (
              <FormField
                control={form.control}
                name="tank_license_expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('cars.fields.tankLicenseExpiry')}</FormLabel>
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
            )}
          </CardContent>
        </Card>

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
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Save />
            )}
            {mode === 'create' ? t('cars.addCar') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
