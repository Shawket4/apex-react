import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  ArrowLeft,
  Edit,
  Trash2,
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  useDriver,
  useDeleteDriver,
  useUpdateDriver,
  useApproveDriver,
  useRejectDriver,
} from '@/entities/driver/queries';
import type { DriverFormValues } from '@/entities/driver/schemas';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Badge } from '@/shared/ui/badge';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { DriverForm } from '@/widgets/driver-form/driver-form';
import { OverviewTab } from '@/widgets/driver-detail/overview-tab';
import { DocumentsTab } from '@/widgets/driver-detail/documents-tab';
import { PinTab } from '@/widgets/driver-detail/pin-tab';
import { FinancialTab } from '@/widgets/driver-detail/financial-tab';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  const { data: driver, isLoading } = useDriver(id);
  const deleteMutation = useDeleteDriver();
  const updateMutation = useUpdateDriver();
  const approveMutation = useApproveDriver();
  const rejectMutation = useRejectDriver();

  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleUpdate = (values: DriverFormValues) => {
    if (!driver) return;
    updateMutation.mutate(
      {
        id: driver.ID,
        ...values,
        mobile_number: values.mobile_number ?? '',
        id_license_expiration_date: values.id_license_expiration_date ?? '',
        transporter: 'Apex',
      },
      {
        onSuccess: () => setShowEditDialog(false),
      },
    );
  };

  const handleDelete = () => {
    if (!driver) return;
    deleteMutation.mutate(driver.ID, {
      onSuccess: () => navigate('/drivers'),
    });
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <PageShell
        title={<Skeleton className="h-8 w-48" />}
        icon={<Users className="h-5 w-5" />}
      >
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </PageShell>
    );
  }

  /* ── Not found ── */
  if (!driver) {
    return (
      <PageShell title={t('common.notFound')} icon={<Users className="h-5 w-5" />}>
        <EmptyState
          lottieSrc="/animations/warning.lottie"
          lottieWidth={100}
          lottieHeight={100}
          title={t('common.notFound')}
          action={
            <Button variant="outline" onClick={() => navigate('/drivers')}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t('common.back')}
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title={driver.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">#{driver.ID}</span>
            <span>·</span>
            <span>{driver.transporter || 'Apex'}</span>
            <span>·</span>
            {driver.is_approved ? (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {t('drivers.status.approved')}
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                {t('drivers.status.pending')}
              </Badge>
            )}
          </span>
        }
        icon={<Users className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/drivers')}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Button>
            {canManage ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.edit')}</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.delete')}</span>
                </Button>
              </>
            ) : (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('common.viewOnly')}
              </Badge>
            )}
          </>
        }
      >
        {/* Pending approval banner — styled to match fuel-events paired banner */}
        {canManage && !driver.is_approved && (
          <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-start gap-2 sm:flex-1">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span className="text-muted-foreground">
                {t('drivers.pendingApprovalBanner')}
              </span>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(driver.ID)}
                disabled={approveMutation.isPending}
                className="h-8"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                {t('drivers.approve')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => rejectMutation.mutate(driver.ID)}
                disabled={rejectMutation.isPending}
                className="h-8"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldX className="h-3.5 w-3.5" />
                )}
                {t('drivers.reject')}
              </Button>
            </div>
          </div>
        )}

        {/* Tabs — Overview is the primary read, Financial is a hub so it goes last */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t('drivers.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="documents">{t('drivers.tabs.documents')}</TabsTrigger>
            <TabsTrigger value="pin">{t('drivers.tabs.pin')}</TabsTrigger>
            <TabsTrigger value="financial">{t('drivers.tabs.financial')}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <OverviewTab driver={driver} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab driver={driver} />
          </TabsContent>
          <TabsContent value="pin">
            <PinTab driverId={driver.ID} driverName={driver.name} />
          </TabsContent>
          <TabsContent value="financial">
            <FinancialTab driverId={driver.ID} />
          </TabsContent>
        </Tabs>
      </PageShell>

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('drivers.editDriver')}</DialogTitle>
          </DialogHeader>
          <DriverForm
            mode="edit"
            driver={driver}
            submitting={updateMutation.isPending}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('drivers.deleteConfirmTitle')}
        description={t('drivers.deleteConfirmDescription', { name: driver.name })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}