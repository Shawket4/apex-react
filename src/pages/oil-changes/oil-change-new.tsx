import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Droplets } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import {
  OilChangeForm,
  type OilChangeFormInitialValues,
} from '@/widgets/oil-change-form/oil-change-form';
import type { OilChangeFormValues } from '@/entities/oil-change/schemas';
import { useAddOilChange } from '@/entities/oil-change/queries';

interface LocationState {
  initialValues?: OilChangeFormInitialValues;
}

export default function OilChangeNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useAddOilChange();

  // Allow the fleet board (or the history page's "Add new" button) to deep-
  // link into a pre-filled form by passing `state.initialValues` to navigate().
  const initial = (location.state as LocationState | null)?.initialValues;

  const handleSubmit = async (values: OilChangeFormValues) => {
    // The Go backend's CreateOilChange handler initialises `current_odometer`
    // to `odometer_at_change` when omitted, so we send the form's values
    // straight through. Mapping `supervisor` -> `super_visor` happens here.
    await mutation.mutateAsync({
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
      title={t('oilChanges.new.title')}
      description={t('oilChanges.new.description')}
      icon={<Droplets className="h-5 w-5" />}
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </Button>
      }
    >
      <OilChangeForm
        mode="create"
        initialValues={initial}
        submitting={mutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/oil-changes')}
        submitLabel={t('oilChanges.actions.create')}
      />
    </PageShell>
  );
}
