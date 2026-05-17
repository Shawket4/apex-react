import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Fuel,
  Users as UsersIcon,
  Car as CarIcon,
  CircleDollarSign,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { StatCard } from '@/shared/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { useAuthStore } from '@/shared/auth/store';
import { useCars } from '@/entities/car/queries';
import { useDrivers } from '@/entities/driver/queries';
import { useFuelEvents } from '@/entities/fuel-event/queries';
import {
  firstDayOfMonth,
  lastDayOfMonth,
  formatCurrency,
  format,
  localDateISO,
} from '@/shared/lib/format';

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'common.goodMorning';
  if (h < 18) return 'common.goodAfternoon';
  return 'common.goodEvening';
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const start = firstDayOfMonth();
  const end = lastDayOfMonth();
  const fromISO = localDateISO(start.getFullYear(), start.getMonth(), start.getDate());
  const toISO = localDateISO(end.getFullYear(), end.getMonth(), end.getDate(), true);

  const { data: cars, isLoading: carsLoading } = useCars();
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: events, isLoading: eventsLoading } = useFuelEvents({
    from: fromISO,
    to: toISO,
  });

  const totalSpend = (events ?? []).reduce((acc, e) => acc + (e.price || 0), 0);

  const recentEvents = (events ?? []).slice(0, 5);

  return (
    <PageShell
      title={t('dashboard.greeting', {
        greeting: t(getGreetingKey()),
        name: user?.name ?? '',
      })}
      description={t('dashboard.subtitle')}
    >
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {carsLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <StatCard
            label={t('dashboard.totalVehicles')}
            value={cars?.length ?? 0}
            icon={CarIcon}
            tone="primary"
          />
        )}
        {driversLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <StatCard
            label={t('dashboard.activeDrivers')}
            value={drivers?.length ?? 0}
            icon={UsersIcon}
            tone="success"
          />
        )}
        {eventsLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <StatCard
            label={t('dashboard.fuelEventsThisMonth')}
            value={events?.length ?? 0}
            icon={Fuel}
            tone="warning"
          />
        )}
        {eventsLoading ? (
          <Skeleton className="h-20" />
        ) : (
          <StatCard
            label={t('dashboard.spendThisMonth')}
            value={formatCurrency(totalSpend)}
            icon={CircleDollarSign}
            tone="primary"
          />
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent events */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.recentFuelEvents')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/fuel-events')}>
              {t('common.viewAll')}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {eventsLoading ? (
              <div className="space-y-2 p-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentEvents.length === 0 ? (
              <EmptyState
                lottieSrc="/animations/no_results.json"
                lottieWidth={100}
                lottieHeight={100}
                title={t('fuelEvents.noEvents')}
                description={t('fuelEvents.noEventsDescription')}
                className="m-6"
                action={
                  <Button onClick={() => navigate('/fuel-events/new')}>
                    <Plus className="h-4 w-4" />
                    {t('fuelEvents.addEvent')}
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {recentEvents.map((e) => (
                  <li
                    key={e.ID}
                    className="flex cursor-pointer items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/fuel-events/${e.ID}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.car_no_plate}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(e.date, 'MMM d, yyyy')}
                        {e.driver_name ? ` · ${e.driver_name}` : ''}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-semibold">{formatCurrency(e.price)}</p>
                      <p className="text-xs text-muted-foreground">{e.liters.toFixed(1)} L</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/fuel-events/new')}
            >
              <Fuel className="h-5 w-5" />
              <span className="text-xs">{t('fuelEvents.addEvent')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/fuel-events')}
            >
              <Fuel className="h-5 w-5" />
              <span className="text-xs">{t('nav.fuelEvents')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/drivers')}
            >
              <UsersIcon className="h-5 w-5" />
              <span className="text-xs">{t('nav.drivers')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/cars')}
            >
              <CarIcon className="h-5 w-5" />
              <span className="text-xs">{t('nav.cars')}</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}