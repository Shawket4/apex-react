import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Radar, Loader2 } from 'lucide-react';
import {
  useZones,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
  useScanZones,
} from '@/entities/zone/queries';
import type { Zone } from '@/entities/zone/schemas';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { ZonesTable } from '@/widgets/zones-table';
import { ZoneFormDialog } from '@/widgets/zone-form-dialog';

export default function ZonesPage() {
  const { t } = useTranslation();

  const { data: zones = [], isLoading } = useZones();
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();
  const deleteMutation = useDeleteZone();
  const scanMutation = useScanZones();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedZone, setSelectedZone] = React.useState<Zone | null>(null);

  const handleCreateNew = () => {
    setSelectedZone(null);
    setDialogOpen(true);
  };

  const handleEdit = (zone: Zone) => {
    setSelectedZone(zone);
    setDialogOpen(true);
  };

  const handleToggleActive = async (zone: Zone) => {
    await updateMutation.mutateAsync({
      id: zone.id,
      payload: { active: !zone.active },
    });
  };

  const handleDelete = async (zone: Zone) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure you want to delete this?'))) {
      await deleteMutation.mutateAsync(zone.id);
    }
  };

  const handleSubmit = async (data: any) => {
    if (selectedZone) {
      await updateMutation.mutateAsync({ id: selectedZone.id, payload: data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleScanNow = async () => {
    await scanMutation.mutateAsync();
  };

  // Only pass active zones that are NOT the currently edited zone (if any) as contextual circles
  const otherZones = React.useMemo(() => {
    return zones.filter(z => z.active && (!selectedZone || z.id !== selectedZone.id));
  }, [zones, selectedZone]);

  return (
    <PageShell
      title={t('zones.title', 'Dead Zones')}
      description={t('zones.description', 'Manage map zones and run dead-zone scans.')}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleScanNow}
            disabled={scanMutation.isPending}
            className="gap-2"
          >
            {scanMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            {t('zones.scanNow', 'Run scan now')}
          </Button>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('zones.newZone', 'New Zone')}
          </Button>
        </div>
      }
    >
      <ZonesTable
        zones={zones}
        loading={isLoading}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />

      <ZoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        zone={selectedZone}
        otherZones={otherZones}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </PageShell>
  );
}
