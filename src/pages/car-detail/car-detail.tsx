import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Car as CarIcon, Edit } from 'lucide-react';
import { carTypeName } from '@/entities/car/labels';
import { useCars } from '@/entities/car/queries';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTabParam } from '@/shared/hooks/use-tab-param';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CarOverviewTab } from '@/widgets/car-detail/overview-tab';
import { CarFormDialog } from '@/widgets/car-form/car-form-dialog';
import { DocumentsPanel } from '@/widgets/documents/documents-panel';

const TABS = ['overview', 'documents'] as const;

function BackToCars() {
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/cars" aria-label={t('common.back')}>
        <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
        <span className="hidden sm:inline">{t('common.back')}</span>
      </Link>
    </Button>
  );
}

/** One car: what is recorded about it, and its papers and photos. */
export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);
  const { data: cars, isLoading } = useCars();
  const [tab, setTab] = useTabParam(TABS);
  const [editing, setEditing] = React.useState(false);

  // There is no single-car endpoint: the fleet list is small and already
  // cached by the page this one is reached from.
  const car = React.useMemo(() => cars?.find((c) => String(c.ID) === id), [cars, id]);
  const icon = <CarIcon className="h-5 w-5" aria-hidden="true" />;

  if (isLoading) {
    return (
      <PageShell title={<Skeleton className="h-8 w-48 rounded-sm" />} icon={icon}>
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageShell>
    );
  }

  if (!car) {
    return (
      <PageShell title={t('common.notFound')} icon={icon}>
        <EmptyState
          lottieSrc="/animations/warning.lottie"
          lottieWidth={100}
          lottieHeight={100}
          title={t('common.notFound')}
          action={<BackToCars />}
        />
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title={<span dir="auto">{car.car_no_plate}</span>}
        description={carTypeName(t, car.car_type) || undefined}
        icon={icon}
        actions={
          <>
            <BackToCars />
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                aria-label={t('common.edit')}
              >
                <Edit aria-hidden="true" />
                <span className="hidden sm:inline">{t('common.edit')}</span>
              </Button>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {t('common.viewOnly')}
              </Badge>
            )}
          </>
        }
      >
        <Tabs value={tab} onValueChange={setTab} dir={i18n.dir()}>
          <TabsList>
            <TabsTrigger value="overview">{t('cars.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="documents">{t('cars.tabs.documents')}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <CarOverviewTab car={car} onOpenDocuments={() => setTab('documents')} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsPanel ownerKind="car" ownerId={car.ID} carType={car.car_type} />
          </TabsContent>
        </Tabs>
      </PageShell>

      <CarFormDialog open={editing} car={car} onClose={() => setEditing(false)} />
    </>
  );
}
