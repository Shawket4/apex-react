import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
        title={<Skeleton className="h-8 w-48 rounded-sm" />}
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
      >
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageShell>
    );
  }

  /* ── Not found ── */
  if (!driver) {
    return (
      <PageShell title={t('common.notFound')} icon={<Users className="h-5 w-5" aria-hidden="true" />}>
        <EmptyState
          lottieSrc="/animations/warning.lottie"
          lottieWidth={100}
          lottieHeight={100}
          title={t('common.notFound')}
          action={
            <Button variant="outline" asChild>
              <Link to="/drivers" onClick={() => navigate('/drivers')}>
                <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                {t('common.back')}
              </Link>
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
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="font-mono tabular-nums">#{driver.ID}</span>
            <span>·</span>
            <span>{driver.transporter || 'Apex'}</span>
            <span>·</span>
            {driver.is_approved ? (
              <Badge variant="success">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {t('drivers.status.approved')}
              </Badge>
            ) : (
              <Badge variant="warning">
                {t('drivers.status.pending')}
              </Badge>
            )}
          </span>
        }
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/drivers" onClick={() => navigate('/drivers')} aria-label={t('common.back')}>
                <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
                <span className="hidden sm:inline">{t('common.back')}</span>
              </Link>
            </Button>
            {canManage ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)} aria-label={t('common.edit')}>
                  <Edit aria-hidden="true" />
                  <span className="hidden sm:inline">{t('common.edit')}</span>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} aria-label={t('common.delete')}>
                  <Trash2 aria-hidden="true" />
                  <span className="hidden sm:inline">{t('common.delete')}</span>
                </Button>
              </>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {t('common.viewOnly')}
              </Badge>
            )}
          </>
        }
      >
        {/* Pending approval banner — styled to match fuel-events paired banner */}
        {canManage && !driver.is_approved && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/10 px-3 py-2.5 text-[12.5px] sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-start gap-2 sm:flex-1">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0">
                {t('drivers.pendingApprovalBanner')}
              </span>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(driver.ID)}
                disabled={approveMutation.isPending}
                className="h-7 px-2.5 gap-1.5"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <ShieldCheck aria-hidden="true" />
                )}
                {t('drivers.approve')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => rejectMutation.mutate(driver.ID)}
                disabled={rejectMutation.isPending}
                className="h-7 px-2.5 gap-1.5"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <ShieldX aria-hidden="true" />
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