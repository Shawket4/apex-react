import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Car,
  User,
  Wrench,
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  oilChangeFormSchema,
  type OilChangeFormValues,
} from '@/entities/oil-change/schemas';
import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import type { Car as CarEntity } from '@/entities/car/schemas';
import type { Driver } from '@/entities/driver/schemas';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { DatePicker } from '@/shared/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { cn } from '@/shared/lib/cn';
import { today } from '@/shared/lib/format';
import { OilChangeStatusPreview } from './oil-change-status-preview';

export interface OilChangeFormInitialValues {
  car_id?: number;
  date?: string;
  driver_name?: string;
  supervisor?: string;
  odometer_at_change?: number | string;
  current_odometer?: number | string;
  mileage?: number | string;
  cost?: number | string;
}

interface OilChangeFormProps {
  mode: 'create' | 'edit';
  initialValues?: OilChangeFormInitialValues;
  submitting: boolean;
  onSubmit: (values: OilChangeFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
  showResetChanges?: boolean;
}

function getDefaults(initial?: OilChangeFormInitialValues): OilChangeFormValues {
  return {
    car_id: (initial?.car_id as number) ?? (undefined as unknown as number),
    date: initial?.date ?? today(),
    driver_name: initial?.driver_name ?? '',
    supervisor: initial?.supervisor ?? '',
    odometer_at_change:
      (initial?.odometer_at_change as number) ?? (undefined as unknown as number),
    current_odometer:
      initial?.current_odometer != null
        ? (initial.current_odometer as number)
        : undefined,
    mileage: (initial?.mileage as number) ?? (undefined as unknown as number),
    cost: (initial?.cost as number) ?? (undefined as unknown as number),
  };
}

/**
 * Shared create + edit form for oil-change records.
 *
 * Three logical sections (vehicle, personnel, maintenance) following the
 * fuel-event form pattern. The driver auto-fills from the picked car's
 * `driver_id` in both modes — switching the car on an existing record
 * almost always means the new car's driver is the right one.
 *
 * `current_odometer` is hidden in create mode (the API copies
 * `odometer_at_change` into it server-side) and visible in edit mode for
 * mid-cycle updates.
 */
export function OilChangeForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
  showResetChanges = false,
}: OilChangeFormProps) {
  const { t } = useTranslation();
  const { data: cars = [], isLoading: carsLoading } = useCars();
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();

  const form = useForm<OilChangeFormValues>({
    resolver: zodResolver(oilChangeFormSchema),
    defaultValues: getDefaults(initialValues),
    mode: 'onTouched',
  });

  const [driverAutoAssigned, setDriverAutoAssigned] = React.useState(false);

  React.useEffect(() => {
    if (initialValues) {
      form.reset(getDefaults(initialValues));
      setDriverAutoAssigned(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialValues?.car_id,
    initialValues?.driver_name,
    initialValues?.date,
    initialValues?.supervisor,
  ]);

  const carOptions = React.useMemo(
    () => cars.map((c) => ({ value: c.ID, label: c.car_no_plate })),
    [cars],
  );
  const driverOptions = React.useMemo(
    () => drivers.map((d) => ({ value: d.name, label: d.name })),
    [drivers],
  );

  // Auto-fill driver on car change. Same approach as the fuel-event form:
  // a ref guards against the initial render firing the effect.
  const watchedCarId = form.watch('car_id');
  const previousCarIdRef = React.useRef<number | undefined>(initialValues?.car_id);

  React.useEffect(() => {
    if (!watchedCarId || watchedCarId === previousCarIdRef.current) return;
    previousCarIdRef.current = watchedCarId;

    const selectedCar: CarEntity | undefined = cars.find((c) => c.ID === watchedCarId);
    if (!selectedCar) return;

    const assignedDriver: Driver | undefined =
      selectedCar.driver_id && selectedCar.driver_id !== 0
        ? drivers.find((d) => d.ID === selectedCar.driver_id)
        : undefined;

    if (assignedDriver) {
      form.setValue('driver_name', assignedDriver.name, { shouldValidate: true });
      setDriverAutoAssigned(true);
    } else {
      setDriverAutoAssigned(false);
    }
  }, [watchedCarId, cars, drivers, form]);

  // Watched values for the live preview card
  const mileage = form.watch('mileage');
  const odometerAtChange = form.watch('odometer_at_change');
  const currentOdometer = form.watch('current_odometer');

  const loading = carsLoading || driversLoading;
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Vehicle + date */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4 text-muted-foreground" />
              {t('oilChanges.form.sections.vehicle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="car_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('oilChanges.fields.carPlate')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={carOptions}
                      value={field.value}
                      onChange={(v) => field.onChange(v as number)}
                      placeholder={t('oilChanges.fields.selectCar')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('oilChanges.fields.date')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      max={today()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Personnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              {t('oilChanges.form.sections.personnel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="driver_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('oilChanges.fields.driver')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={driverOptions}
                      value={field.value || null}
                      onChange={(v) => {
                        field.onChange(v as string);
                        setDriverAutoAssigned(false);
                      }}
                      placeholder={t('oilChanges.fields.selectDriver')}
                      className={cn(driverAutoAssigned && 'border-primary/40')}
                    />
                  </FormControl>
                  {driverAutoAssigned && !form.formState.errors.driver_name && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {t('oilChanges.fields.driverAutoAssigned')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          form.setValue('driver_name', '', { shouldValidate: true });
                          setDriverAutoAssigned(false);
                        }}
                        className="ms-auto inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        <span>{t('common.clear')}</span>
                      </button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supervisor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('oilChanges.fields.supervisor')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t('oilChanges.fields.supervisorPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Maintenance details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              {t('oilChanges.form.sections.maintenance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                'grid grid-cols-1 gap-4',
                mode === 'edit' ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
              )}
            >
              <FormField
                control={form.control}
                name="odometer_at_change"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('oilChanges.fields.odometerAtChange')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? undefined : e.target.value,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current odometer is only relevant when amending an existing
                  record — on create, the API copies odometer_at_change into
                  it. Hiding it removes a confusing field. */}
              {mode === 'edit' && (
                <FormField
                  control={form.control}
                  name="current_odometer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('oilChanges.fields.currentOdometer')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? undefined : e.target.value,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('oilChanges.fields.mileage')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? undefined : e.target.value,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('oilChanges.fields.cost')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="pe-14"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? undefined : e.target.value,
                          )
                        }
                      />
                      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        EGP
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <OilChangeStatusPreview
              mileage={Number(mileage) || 0}
              odometerAtChange={Number(odometerAtChange) || 0}
              currentOdometer={
                currentOdometer != null ? Number(currentOdometer) : undefined
              }
            />
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:flex-row md:justify-end md:gap-3 md:px-6">
          {showResetChanges && form.formState.isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={submitting}
              className="md:me-auto"
            >
              <RotateCcw className="h-4 w-4" />
              {t('common.reset')}
            </Button>
          )}
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
            {submitLabel ?? t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
