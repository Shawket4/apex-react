import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterCar, useSetCarDriver, useUpdateCar } from '@/entities/car/queries';
import { carPayload, type Car, type CarFormValues } from '@/entities/car/schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { CarForm } from './car-form';

interface CarFormDialogProps {
  open: boolean;
  /** The car to edit, or null to add a new one. */
  car: Car | null;
  onClose: () => void;
}

/**
 * Add or edit a car. The dialog owns the save: the car's own fields go to the
 * cars API, and its driver, which is a pairing rather than a field, is set
 * afterwards and only when it changed.
 */
export function CarFormDialog({ open, car, onClose }: CarFormDialogProps) {
  const { t } = useTranslation();
  const register = useRegisterCar();
  const update = useUpdateCar();
  const setDriver = useSetCarDriver();

  // What the dialog shows while it closes: the caller has already let go of
  // the car by then, and the form should not turn into a blank one on its way out.
  const [shown, setShown] = React.useState(car);
  if (open && shown !== car) setShown(car);

  const submit = async (values: CarFormValues) => {
    const editing = open ? car : shown;
    let carId: number;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.ID, data: carPayload(values) });
        carId = editing.ID;
      } else {
        carId = await register.mutateAsync(carPayload(values));
      }
    } catch {
      toast.error(t('cars.saveFailed'));
      return;
    }

    if (values.driver_id !== (editing?.driver_id ?? 0)) {
      try {
        await setDriver.mutateAsync({ carId, driverId: values.driver_id });
      } catch {
        // The car itself is saved. Keeping the form open would invite saving
        // it a second time, so say what is left to do and close.
        toast.error(t('cars.driverNotAssigned'));
        onClose();
        return;
      }
    }
    toast.success(t(editing ? 'cars.updatedSuccessfully' : 'cars.registeredSuccessfully'));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{t(shown ? 'cars.editCar' : 'cars.registerNewCar')}</DialogTitle>
        </DialogHeader>
        <CarForm
          key={shown?.ID ?? 'new'}
          car={shown}
          submitting={register.isPending || update.isPending || setDriver.isPending}
          onSubmit={submit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
