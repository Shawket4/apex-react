import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Car as CarIcon } from 'lucide-react';
import type { Car } from '@/entities/car/schemas';
import { PageShell } from '@/shared/ui/page-shell';
import { CarFormDialog } from '@/widgets/car-form/car-form-dialog';
import { CarsTable } from '@/widgets/cars-table/cars-table';

/** What the form dialog is open on: a car to edit, or a new one. */
type FormTarget = { car: Car | null } | null;

export default function CarsPage() {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FormTarget>(null);

  return (
    <>
      <PageShell
        title={t('nav.cars')}
        description={t('cars.subtitle')}
        icon={<CarIcon className="h-5 w-5" />}
      >
        <CarsTable
          onAddCar={() => setForm({ car: null })}
          onEditCar={(car) => setForm({ car })}
        />
      </PageShell>

      <CarFormDialog open={form !== null} car={form?.car ?? null} onClose={() => setForm(null)} />
    </>
  );
}
