import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { DriversTable } from '@/widgets/drivers-table/drivers-table';
import { DriverForm } from '@/widgets/driver-form/driver-form';
import { useRegisterDriver } from '@/entities/driver/queries';
import { driverPayload, type DriverFormValues } from '@/entities/driver/schemas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export default function DriversPage() {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const registerMutation = useRegisterDriver();

  const handleSubmit = (values: DriverFormValues) => {
    registerMutation.mutate(driverPayload(values), {
      onSuccess: () => setShowAddDialog(false),
    });
  };

  return (
    <>
      <PageShell
        title={t('nav.drivers')}
        description={t('drivers.subtitle')}
        icon={<Users className="h-5 w-5" />}
      >
        <DriversTable onAddDriver={() => setShowAddDialog(true)} />
      </PageShell>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
          <DialogHeader>
            <DialogTitle>{t('drivers.addDriver')}</DialogTitle>
          </DialogHeader>
          <DriverForm
            submitting={registerMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
