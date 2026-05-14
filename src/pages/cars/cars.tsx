import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Car as CarIcon } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { CarsTable } from '@/widgets/cars-table/cars-table';
import { CarForm } from '@/widgets/car-form/car-form';
import { useRegisterCar, useUpdateCar, useSetCarDriver } from '@/entities/car/queries';
import type { CarFormValues, Car } from '@/entities/car/schemas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toaster';

export default function CarsPage() {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [editingCar, setEditingCar] = React.useState<Car | null>(null);

  const registerMutation = useRegisterCar();
  const updateMutation = useUpdateCar();
  const setDriverMutation = useSetCarDriver();

  const handleSubmit = async (values: CarFormValues) => {
    const { driver_id, ...carData } = values;
    
    try {
      if (editingCar) {
        // Update car
        await updateMutation.mutateAsync(
          { id: editingCar.ID, data: carData },
          {
            onSuccess: async () => {
              // Update driver if changed
              if (driver_id !== editingCar.driver_id) {
                await setDriverMutation.mutateAsync({
                  carId: editingCar.ID,
                  driverId: driver_id || 0,
                });
              }
              setEditingCar(null);
              toast.success(t('cars.updatedSuccessfully'));
            },
          }
        );
      } else {
        // Create car
        await registerMutation.mutateAsync(
          values, // Pass all values, API might handle driver_id
          {
            onSuccess: async (newCar) => {
              // Ensure driver is set if not handled by create API
              if (driver_id) {
                await setDriverMutation.mutateAsync({
                  carId: newCar.ID,
                  driverId: driver_id,
                });
              }
              setShowAddDialog(false);
              toast.success(t('cars.registeredSuccessfully'));
            },
          }
        );
      }
    } catch (err) {
      console.error('Error submitting car:', err);
      // Errors are likely handled by the mutation hooks (toast.error)
    }
  };

  return (
    <>
      <PageShell
        title={t('nav.cars')}
        description={t('cars.subtitle')}
        icon={<CarIcon className="h-5 w-5" />}
      >
        <CarsTable 
          onAddCar={() => setShowAddDialog(true)} 
          onEditCar={(car) => setEditingCar(car)}
        />
      </PageShell>

      <Dialog 
        open={showAddDialog || !!editingCar} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingCar(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCar 
                ? t('cars.editCar') 
                : t('cars.registerNewCar')}
            </DialogTitle>
          </DialogHeader>
          <CarForm
            mode={editingCar ? 'edit' : 'create'}
            car={editingCar}
            submitting={registerMutation.isPending || updateMutation.isPending || setDriverMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowAddDialog(false);
              setEditingCar(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
