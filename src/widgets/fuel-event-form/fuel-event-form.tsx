import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Car,
  Droplet,
  Gauge,
  Info,
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { fuelEventFormSchema, type FuelEventFormValues } from '@/entities/fuel-event/schemas';
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
import {
  calculateDistance,
  calculateFuelRate,
  calculateTotalPrice,
  evaluateEfficiency,
} from '@/shared/lib/fuel';
import { formatCurrency, formatNumber, today } from '@/shared/lib/format';
import { DEFAULT_PRICE_PER_LITER, FUEL_EFFICIENCY } from '@/shared/config/constants';

export interface FuelEventFormInitialValues {
  car_id?: number;
  driver_name?: string;
  date?: string;
  liters?: number | string;
  price_per_liter?: number | string;
  odometer_before?: number | string;
  odometer_after?: number | string;
}

interface FuelEventFormProps {
  mode: 'create' | 'edit';
  initialValues?: FuelEventFormInitialValues;
  submitting: boolean;
  onSubmit: (values: FuelEventFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
  showResetChanges?: boolean;
}

function getDefaults(initial?: FuelEventFormInitialValues): FuelEventFormValues {
  return {
    car_id: (initial?.car_id as number) ?? (undefined as unknown as number),
    driver_name: initial?.driver_name ?? '',
    date: initial?.date ?? today(),
    liters: (initial?.liters as number) ?? (undefined as unknown as number),
    price_per_liter:
      (initial?.price_per_liter as number) ?? (parseFloat(DEFAULT_PRICE_PER_LITER) as number),
    odometer_before: (initial?.odometer_before as number) ?? (undefined as unknown as number),
    odometer_after: (initial?.odometer_after as number) ?? (undefined as unknown as number),
  };
}

export function FuelEventForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
  showResetChanges = false,
}: FuelEventFormProps) {
  const { t } = useTranslation();
  const { data: cars = [], isLoading: carsLoading } = useCars();
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();

  const form = useForm<FuelEventFormValues>({
    resolver: zodResolver(fuelEventFormSchema),
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
  }, [initialValues?.car_id, initialValues?.driver_name, initialValues?.date]);

  const carOptions = React.useMemo(
    () => cars.map((c) => ({ value: c.ID, label: c.car_no_plate })),
    [cars],
  );

  const driverOptions = React.useMemo(
    () => drivers.map((d) => ({ value: d.name, label: d.name })),
    [drivers],
  );

  // Auto-fill driver on car change. Runs in BOTH create and edit modes —
  // when a user deliberately switches the car in an existing event, they
  // almost always want the new car's assigned driver too. The ref check
  // prevents the initial load (where `watchedCarId === previousCarIdRef`)
  // from firing.
  //
  // Odometer pre-fill, however, stays gated to create mode. Overwriting
  // a historical event's odometer-before with the newest live reading
  // would corrupt the record.
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

    // Odometer prefill only on create — never overwrite historical data
    if (mode === 'create' && selectedCar.last_fuel_odometer != null) {
      form.setValue('odometer_before', selectedCar.last_fuel_odometer, {
        shouldValidate: true,
      });
    }
  }, [watchedCarId, cars, drivers, form, mode]);

  // Live calculations
  const liters = form.watch('liters');
  const pricePerLiter = form.watch('price_per_liter');
  const odometerBefore = form.watch('odometer_before');
  const odometerAfter = form.watch('odometer_after');

  const calc = React.useMemo(() => {
    const distance = calculateDistance(odometerBefore ?? 0, odometerAfter ?? 0);
    const fuelRate = calculateFuelRate(liters ?? 0, odometerBefore ?? 0, odometerAfter ?? 0);
    const totalPrice = calculateTotalPrice(liters ?? 0, pricePerLiter ?? 0);
    return { distance, fuelRate, totalPrice };
  }, [liters, pricePerLiter, odometerBefore, odometerAfter]);

  const efficiency = evaluateEfficiency(calc.fuelRate);

  const loading = carsLoading || driversLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Vehicle & Driver */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4 text-muted-foreground" />
              {t('fuelEvents.fields.car')} &amp; {t('fuelEvents.fields.driver')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="car_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fuelEvents.fields.carPlate')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={carOptions}
                      value={field.value}
                      onChange={(v) => field.onChange(v as number)}
                      placeholder={t('fuelEvents.fields.selectCar')}
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
                  <FormLabel>{t('fuelEvents.fields.driver')}</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={driverOptions}
                      value={field.value || null}
                      onChange={(v) => {
                        field.onChange(v as string);
                        setDriverAutoAssigned(false);
                      }}
                      placeholder={t('fuelEvents.fields.selectDriver')}
                      className={cn(driverAutoAssigned && 'border-primary/40')}
                    />
                  </FormControl>
                  {driverAutoAssigned && !form.formState.errors.driver_name && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 text-xs text-primary">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t('fuelEvents.fields.driverAutoAssigned')}</span>
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
          </CardContent>
        </Card>

        {/* Fuel details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplet className="h-4 w-4 text-muted-foreground" />
              {t('fuelEvents.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fuelEvents.fields.date')}</FormLabel>
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

            <FormField
              control={form.control}
              name="liters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fuelEvents.fields.liters')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? undefined : e.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_per_liter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fuelEvents.fields.pricePerLiter')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? undefined : e.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/*
              Total price mirrors the structure of sibling FormFields exactly
              (plain FormLabel, FormControl, FormMessage). The readonly div
              swaps in for <Input /> inside FormControl.
            */}
            <FormItem>
              <FormLabel>{t('fuelEvents.fields.totalPrice')}</FormLabel>
              <FormControl>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-semibold shadow-sm">
                  {formatCurrency(calc.totalPrice)}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </CardContent>
        </Card>

        {/* Odometer + efficiency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              {t('fuelEvents.fields.odometerBefore')} / {t('fuelEvents.fields.odometerAfter')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="odometer_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fuelEvents.fields.odometerBefore')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odometer_after"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fuelEvents.fields.odometerAfter')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? undefined : e.target.value)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t('fuelEvents.fields.distance')}</p>
                <p className="text-xl font-semibold">{formatNumber(calc.distance, 0)} km</p>
              </div>
              <div className={cn('rounded-lg border p-3', efficiency.bgClassName)}>
                <p className="text-xs text-muted-foreground">{t('fuelEvents.fields.fuelRate')}</p>
                <div className="flex items-center justify-between">
                  <p className={cn('text-xl font-semibold', efficiency.className)}>
                    {formatNumber(calc.fuelRate, 1)} {t('fuelEvents.efficiency.unit')}
                  </p>
                  <div className="flex items-center gap-1">
                    <span>{efficiency.icon}</span>
                    <span className={cn('text-xs font-medium', efficiency.className)}>
                      {t(efficiency.labelKey)}
                    </span>
                  </div>
                </div>
                {!efficiency.isValid && calc.fuelRate > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    {t('fuelEvents.efficiency.excludedReason', {
                      min: FUEL_EFFICIENCY.MIN_VALID,
                      max: FUEL_EFFICIENCY.MAX_VALID,
                    })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
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