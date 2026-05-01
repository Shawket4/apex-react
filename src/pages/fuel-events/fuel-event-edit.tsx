import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Fuel } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { FuelEventForm } from '@/widgets/fuel-event-form/fuel-event-form';
import { useFuelEvent, useEditFuelEvent } from '@/entities/fuel-event/queries';
import { useCars } from '@/entities/car/queries';
import type { FuelEventFormValues } from '@/entities/fuel-event/schemas';
import { toInputDate } from '@/shared/lib/format';

export default function FuelEventEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: event, isLoading, isError } = useFuelEvent(id);
  const { data: cars } = useCars();
  const editEvent = useEditFuelEvent();

  const handleSubmit = async (values: FuelEventFormValues) => {
    if (!id) return;
    await editEvent.mutateAsync({
      ID: Number(id),
      car_id: values.car_id,
      date: values.date,
      liters: values.liters,
      price_per_liter: values.price_per_liter,
      odometer_before: values.odometer_before,
      odometer_after: values.odometer_after,
      driver_id: values.driver_id ?? null,
      driver_name: values.driver_name,
    });
    navigate(`/fuel-events/${id}`);
  };

  const initialValues = React.useMemo(() => {
    if (!event || !cars) return undefined;
    const matchingCar = cars.find((c) => c.car_no_plate === event.car_no_plate);
    return {
      car_id: matchingCar?.ID,
      driver_id: event.driver_id ?? null,
      driver_name: event.driver_name ?? '',
      date: toInputDate(event.date),
      liters: event.liters,
      price_per_liter: event.price_per_liter,
      odometer_before: event.odometer_before,
      odometer_after: event.odometer_after,
    };
  }, [event, cars]);

  return (
    <PageShell
      title={t('fuelEvents.editEvent')}
      icon={<Fuel className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        {isError ? (
          <EmptyState
            title={t('fuelEvents.loadFailed')}
            action={
              <Button variant="outline" onClick={() => navigate('/fuel-events')}>
                {t('common.back')}
              </Button>
            }
          />
        ) : isLoading || !initialValues ? (
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-56" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <FuelEventForm
            mode="edit"
            initialValues={initialValues}
            submitting={editEvent.isPending}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            submitLabel={t('common.save')}
            showResetChanges
          />
        )}
      </div>
    </PageShell>
  );
}
