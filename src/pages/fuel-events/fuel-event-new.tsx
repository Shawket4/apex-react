import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Fuel } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { FuelEventForm } from '@/widgets/fuel-event-form/fuel-event-form';
import { useAddFuelEvent } from '@/entities/fuel-event/queries';
import type { FuelEventFormValues } from '@/entities/fuel-event/schemas';

export default function FuelEventNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const carIdParam = searchParams.get('carId');
  const addEvent = useAddFuelEvent();

  const handleSubmit = async (values: FuelEventFormValues) => {
    await addEvent.mutateAsync({
      car_id: values.car_id,
      date: values.date,
      liters: values.liters,
      price_per_liter: values.price_per_liter,
      odometer_before: values.odometer_before,
      odometer_after: values.odometer_after,
      driver_name: values.driver_name,
    });
    navigate('/fuel-events');
  };

  return (
    <PageShell
      title={t('fuelEvents.addEvent')}
      icon={<Fuel className="h-5 w-5" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        <FuelEventForm
          mode="create"
          initialValues={{
            car_id: carIdParam ? parseInt(carIdParam, 10) : undefined,
          }}
          submitting={addEvent.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          submitLabel={t('common.save')}
        />
      </div>
    </PageShell>
  );
}
