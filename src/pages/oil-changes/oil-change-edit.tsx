import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Droplets } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import {
  OilChangeForm,
  type OilChangeFormInitialValues,
} from '@/widgets/oil-change-form/oil-change-form';
import type { OilChangeFormValues } from '@/entities/oil-change/schemas';
import {
  useEditOilChange,
  useOilChange,
} from '@/entities/oil-change/queries';
import { useCars } from '@/entities/car/queries';
import { extractErrorMessage } from '@/shared/api/errors';

export default function OilChangeEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: record, isLoading, isError, error } = useOilChange(id);
  const { data: cars = [], isLoading: carsLoading } = useCars();
  const mutation = useEditOilChange();

  // Resolve `car_no_plate` -> `car_id` so the form's car SearchableSelect
  // can pre-select. The legacy GetOilChange endpoint emits `car_no_plate`
  // but never `car_id`, so we look it up against the cars list — same
  // approach the legacy edit page used.
  const initialValues: OilChangeFormInitialValues | undefined = React.useMemo(() => {
    if (!record) return undefined;
    const car = cars.find((c) => c.car_no_plate === record.car_no_plate);
    return {
      car_id: car?.ID,
      date: record.date,
      driver_name: record.driver_name,
      supervisor: record.super_visor,
      odometer_at_change: record.odometer_at_change,
      current_odometer: record.current_odometer,
      mileage: record.mileage,
      cost: record.cost,
    };
  }, [record, cars]);

  const handleSubmit = async (values: OilChangeFormValues) => {
    if (!id) return;
    await mutation.mutateAsync({
      ID: Number(id),
      car_id: values.car_id,
      date: values.date,
      super_visor: values.supervisor,
      driver_name: values.driver_name,
      mileage: values.mileage,
      odometer_at_change: values.odometer_at_change,
      current_odometer: values.current_odometer ?? values.odometer_at_change,
      cost: values.cost,
    });
    navigate('/oil-changes');
  };

  return (
    <PageShell
      title={
        <span className="flex items-center gap-3">
          {t('oilChanges.edit.title')}
          {record && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              ID: {record.ID}
            </span>
          )}
        </span>
      }
      description={record?.car_no_plate ?? t('oilChanges.edit.description')}
      icon={<Droplets className="h-5 w-5" />}
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </Button>
      }
    >
      {isError ? (
        <EmptyState
          icon={<Droplets className="h-5 w-5" />}
          title={t('oilChanges.edit.loadFailed')}
          description={extractErrorMessage(error)}
          action={
            <Button onClick={() => navigate('/oil-changes')} variant="outline">
              {t('common.back')}
            </Button>
          }
        />
      ) : isLoading || carsLoading || !initialValues ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <OilChangeForm
          mode="edit"
          initialValues={initialValues}
          submitting={mutation.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/oil-changes')}
          submitLabel={t('oilChanges.actions.save')}
          showResetChanges
        />
      )}
    </PageShell>
  );
}
