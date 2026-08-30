import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { intentProps, warmFuelForm } from '@/shared/lib/prefetch';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Droplet,
  DollarSign,
  Gauge,
  User,
  Edit,
  Trash2,
  Fuel,
  AlertTriangle,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { Separator } from '@/shared/ui/separator';
import { EmptyState } from '@/shared/ui/empty-state';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { useFuelEvent, useDeleteFuelEvent } from '@/entities/fuel-event/queries';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { evaluateEfficiency } from '@/shared/lib/fuel';
import { formatCurrency, formatNumber, format } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

interface DetailRowProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-sm font-medium tabular-nums" dir="auto">{value ?? <span className="opacity-40">—</span>}</p>
      </div>
    </div>
  );
}

export default function FuelEventDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // Where "back" goes: the page that linked here (the dashboard's fuel panel
  // passes its full URL, scope included), else the fuel-events list.
  const backTo = (location.state as { from?: string } | null)?.from ?? '/fuel-events';
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const { canEditFuel, canDeleteFuel } = usePermissions();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const { data: event, isLoading, isError } = useFuelEvent(params.id);
  const deleteEvent = useDeleteFuelEvent();

  const handleDelete = async () => {
    if (!params.id) return;
    await deleteEvent.mutateAsync(Number(params.id));
    setConfirmOpen(false);
    navigate(backTo);
  };

  if (isLoading) {
    return (
      <PageShell
        title={<Skeleton className="h-8 w-48 rounded-sm" />}
        icon={<Fuel className="h-5 w-5" />}
      >
        <div className="mx-auto w-full max-w-4xl space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-[92px] rounded-lg" />
            <Skeleton className="h-[92px] rounded-lg" />
            <Skeleton className="h-[92px] rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageShell>
    );
  }

  if (isError || !event) {
    return (
      <PageShell title={t('common.notFound')} icon={<Fuel className="h-5 w-5" />}>
        <EmptyState
          lottieSrc="/animations/warning.lottie"
          lottieWidth={100}
          lottieHeight={100}
          title={t('fuelEvents.loadFailed')}
          action={
            <Button variant="outline" onClick={() => navigate(backTo)}>
              <ArrowLeft className="rtl:rotate-180" />
              {t('common.back')}
            </Button>
          }
        />
      </PageShell>
    );
  }

  const distance = event.odometer_after - event.odometer_before;
  const eff = evaluateEfficiency(event.fuel_rate);

  return (
    <PageShell
      title={event.car_no_plate}
      description={
        <span className="inline-flex items-center gap-2">
          <span>#{event.ID}</span>
          <span>·</span>
          <span>{format(event.date, 'd MMM yyyy')}</span>
          {event.driver_name && (
            <>
              <span>·</span>
              <span dir="auto">{event.driver_name}</span>
            </>
          )}
        </span>
      }
      icon={<Fuel className="h-5 w-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
            <ArrowLeft className="rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Button>
          {canEditFuel && (
            <Button
              size="sm"
              {...intentProps(() => warmFuelForm(queryClient, 'fuel-event-edit'))}
              onClick={() => navigate(`/fuel-events/${event.ID}/edit`)}
            >
              <Edit />
              <span className="hidden sm:inline">{t('common.edit')}</span>
            </Button>
          )}
          {canDeleteFuel && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
              <Trash2 />
              <span className="hidden sm:inline">{t('common.delete')}</span>
            </Button>
          )}
          {!canEditFuel && !canDeleteFuel && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              {t('common.viewOnly')}
            </Badge>
          )}
        </>
      }
    >
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
        {/* Highlight card — fuel rate */}
        <Card className={cn('md:col-span-1 shadow-none', eff.bgClassName)}>
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-3 w-3" />
              {t('fuelEvents.fields.fuelRate')}
            </div>
            <p className={cn('font-mono text-[22px] font-semibold leading-none tabular-nums', eff.className)}>
              {formatNumber(event.fuel_rate, 1)} {t('fuelEvents.efficiency.unit')}
            </p>
            <div className="flex items-center gap-2">
              <span>{eff.icon}</span>
              <span className={cn('text-sm font-medium', eff.className)}>
                {t(eff.labelKey)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Highlight card — cost */}
        <Card className="shadow-none">
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {t('fuelEvents.fields.totalPrice')}
            </div>
            <p className="font-mono text-[22px] font-semibold leading-none tabular-nums text-money">{formatCurrency(event.price)}</p>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatNumber(event.liters, 2)} L × {formatCurrency(event.price_per_liter)}
            </p>
          </CardContent>
        </Card>

        {/* Highlight card — distance */}
        <Card className="shadow-none">
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-3 w-3" />
              {t('fuelEvents.fields.distance')}
            </div>
            <p className="font-mono text-[22px] font-semibold leading-none tabular-nums">{formatNumber(distance, 0)} km</p>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatNumber(event.odometer_before)} → {formatNumber(event.odometer_after)}
            </p>
          </CardContent>
        </Card>

        {/* Details grid */}
        <Card className="overflow-hidden shadow-none md:col-span-3">
          <h2 className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('common.details')}</h2>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label={t('fuelEvents.fields.date')}
                value={format(event.date, 'd MMM yyyy')}
              />
              {event.time && (
                <DetailRow
                  icon={<Clock className="h-4 w-4" />}
                  label={t('fuelEvents.fields.time')}
                  value={event.time}
                />
              )}
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label={t('fuelEvents.fields.driver')}
                value={event.driver_name}
              />
              <DetailRow
                icon={<Droplet className="h-4 w-4" />}
                label={t('fuelEvents.fields.liters')}
                value={`${formatNumber(event.liters, 2)} L`}
              />
              <DetailRow
                icon={<DollarSign className="h-4 w-4" />}
                label={t('fuelEvents.fields.pricePerLiter')}
                value={<span className="font-mono tabular-nums text-money">{formatCurrency(event.price_per_liter)}</span>}
              />
              <DetailRow
                icon={<DollarSign className="h-4 w-4" />}
                label={t('fuelEvents.fields.totalPrice')}
                value={<span className="font-mono tabular-nums text-money">{formatCurrency(event.price)}</span>}
              />
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow
                icon={<Gauge className="h-4 w-4" />}
                label={t('fuelEvents.fields.odometerBefore')}
                value={`${formatNumber(event.odometer_before)} km`}
              />
              <DetailRow
                icon={<Gauge className="h-4 w-4" />}
                label={t('fuelEvents.fields.odometerAfter')}
                value={`${formatNumber(event.odometer_after)} km`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('fuelEvents.deleteConfirmTitle')}
        description={t('fuelEvents.deleteConfirmDescription', { plate: event.car_no_plate })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        loading={deleteEvent.isPending}
        onConfirm={handleDelete}
      />
    </PageShell>
  );
}
