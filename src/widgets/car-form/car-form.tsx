import * as React from 'react';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Container, Gauge, Loader2, Plus, Save, Trash2, Truck, User } from 'lucide-react';
import {
  CAR_TYPES,
  TRAILER_CAR_TYPE,
  carFormDefaults,
  carFormSchema,
  type Car,
  type CarFormValues,
} from '@/entities/car/schemas';
import { carTypeName } from '@/entities/car/labels';
import { useDrivers } from '@/entities/driver/queries';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { FormSection } from '@/shared/ui/form-section';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface CarFormProps {
  /** The car being edited. Leave out to add a new one. */
  car?: Car | null;
  submitting: boolean;
  onSubmit: (values: CarFormValues) => void | Promise<void>;
  onCancel: () => void;
}

/** The fields that take typed text: everything but the type, the driver and the tank. */
type TextFieldName = Exclude<
  { [K in keyof CarFormValues]: CarFormValues[K] extends string ? K : never }[keyof CarFormValues],
  'car_type'
>;

interface TextFieldProps {
  control: Control<CarFormValues>;
  name: TextFieldName;
  label: string;
  placeholder?: string;
  /** A unit shown inside the field's end. Makes the field a number. */
  unit?: string;
  /** A whole number (litres, cc, cylinders) rather than a decimal (tons). */
  whole?: boolean;
}

function TextField({ control, name, label, placeholder, unit, whole }: TextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                placeholder={placeholder}
                autoComplete="off"
                inputMode={whole ? 'numeric' : unit ? 'decimal' : undefined}
                className={cn((unit || whole) && 'tabular-nums', unit && 'pe-12')}
              />
            </FormControl>
            {unit ? (
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** The kinds to choose from, plus the car's own if it is one FalconGo no longer offers. */
function typeChoices(current: string): string[] {
  const known: readonly string[] = CAR_TYPES;
  return known.includes(current) ? [...known] : [...known, current];
}

function litresTotal(rows: CarFormValues['compartments']): number {
  return rows.reduce((sum, row) => {
    const litres = Number(row.litres);
    return Number.isFinite(litres) && litres > 0 ? sum + litres : sum;
  }, 0);
}

function capacityLine(t: TFunction, litres: number): string {
  return `${litres.toLocaleString()} ${t('cars.units.litre')}`;
}

export function CarForm({ car, submitting, onSubmit, onCancel }: CarFormProps) {
  const { t } = useTranslation();
  const { data: drivers = [] } = useDrivers();

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues: carFormDefaults(car),
    mode: 'onTouched',
  });
  const { control } = form;
  const compartments = useFieldArray({ control, name: 'compartments' });
  const carType = useWatch({ control, name: 'car_type' });
  const tankRows = useWatch({ control, name: 'compartments' });

  const driverOptions = React.useMemo(
    () => [
      { value: 0, label: t('cars.noDriver') },
      ...drivers.map((driver) => ({ value: driver.ID, label: driver.name })),
    ],
    [drivers, t],
  );

  // A car recorded with a capacity and no layout keeps showing that capacity
  // until sections are typed in: it is what a save would leave in place.
  const typedTotal = litresTotal(tankRows);
  const capacity = typedTotal > 0 ? typedTotal : (car?.tank_capacity ?? 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <p className="text-sm text-muted-foreground">{t('cars.form.onlyPlateRequired')}</p>

        <FormSection icon={Truck} title={t('cars.sections.vehicleInfo')}>
          <TextField
            control={control}
            name="car_no_plate"
            label={t('cars.fields.plateNumber')}
            placeholder={t('cars.fields.plateNumberPlaceholder')}
          />
          <FormField
            control={control}
            name="car_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('cars.fields.carType')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeChoices(field.value).map((type) => (
                      <SelectItem key={type} value={type}>
                        {carTypeName(t, type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField control={control} name="chassis_no" label={t('cars.fields.chassisNumber')} />
          <TextField control={control} name="engine_no" label={t('cars.fields.engineNumber')} />
          <TextField
            control={control}
            name="engine_cc"
            label={t('cars.fields.engineSize')}
            unit={t('cars.units.cc')}
            whole
          />
          <TextField
            control={control}
            name="engine_cylinders"
            label={t('cars.fields.cylinders')}
            whole
          />
          <TextField
            control={control}
            name="payload_tons"
            label={t('cars.fields.payload')}
            unit={t('cars.units.ton')}
          />
          <TextField control={control} name="color" label={t('cars.fields.color')} />
        </FormSection>

        {carType === TRAILER_CAR_TYPE ? (
          <FormSection icon={Container} title={t('cars.sections.trailer')}>
            <TextField
              control={control}
              name="trailer_no_plate"
              label={t('cars.fields.trailerPlateNumber')}
              placeholder={t('cars.fields.plateNumberPlaceholder')}
            />
            <TextField
              control={control}
              name="trailer_chassis_no"
              label={t('cars.fields.chassisNumber')}
            />
            <TextField
              control={control}
              name="trailer_payload_tons"
              label={t('cars.fields.payload')}
              unit={t('cars.units.ton')}
            />
            <TextField control={control} name="trailer_color" label={t('cars.fields.color')} />
          </FormSection>
        ) : null}

        <FormSection icon={User} title={t('cars.sections.driverAssignment')} className="sm:grid-cols-1">
          <FormField
            control={control}
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
        </FormSection>

        <FormSection
          icon={Gauge}
          title={t('cars.sections.compartments')}
          aside={
            capacity > 0 ? (
              <span className="font-mono tabular-nums">{capacityLine(t, capacity)}</span>
            ) : null
          }
          className="grid-cols-2 sm:grid-cols-4"
        >
          {compartments.fields.map((row, index) => (
            <FormField
              key={row.id}
              control={control}
              name={`compartments.${index}.litres`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t('cars.sections.compartmentIndex', { index: index + 1 })}
                  </FormLabel>
                  <div className="flex items-center gap-1">
                    <div className="relative min-w-0 flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          autoComplete="off"
                          className="pe-7 tabular-nums"
                        />
                      </FormControl>
                      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {t('cars.units.litre')}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => compartments.remove(index)}
                      aria-label={t('cars.sections.removeCompartment')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <div className="col-span-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => compartments.append({ litres: '' })}
            >
              <Plus />
              {t('cars.sections.addCompartment')}
            </Button>
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || (!!car && !form.formState.isDirty)}>
            {submitting ? <Loader2 className="animate-spin" /> : <Save />}
            {car ? t('common.save') : t('cars.addCar')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
