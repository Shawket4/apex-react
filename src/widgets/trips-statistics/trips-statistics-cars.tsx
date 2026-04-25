import { useTranslation } from 'react-i18next';
import { Car as CarIcon } from 'lucide-react';
import { CollapsibleSection } from '@/shared/ui/collapsible-section';
import { RankedList, type RankedListItem } from '@/shared/ui/ranked-list';
import { formatNumber } from '@/shared/lib/format';
import { formatCompactCurrency } from '@/shared/lib/format-number';
import type { CarStat, CompanyStat } from '@/entities/trip-statistics/schemas';

interface TripsStatisticsCarsProps {
  companies: CompanyStat[];
  hasFinancialAccess: boolean;
}

/**
 * Vehicle performance ranking.
 *
 * Flattens cars across all routes / groups in every company response and
 * aggregates by plate. The same plate may appear in multiple routes —
 * we sum its contributions so the dashboard shows fleet-wide activity per
 * vehicle rather than a route-specific subset.
 */
export function TripsStatisticsCars({
  companies,
  hasFinancialAccess,
}: TripsStatisticsCarsProps) {
  const { t } = useTranslation();

  // Walk every nesting layer and collect car stats by plate.
  const map = new Map<string, CarStat>();
  for (const c of companies) {
    // From route_details
    for (const r of c.route_details ?? []) {
      for (const car of r.cars ?? []) accumulate(map, car);
    }
    // From details (groups)
    for (const g of c.details ?? []) {
      for (const car of g.cars ?? []) accumulate(map, car);
    }
    // From cars_by_terminal (TAQA-specific)
    if (c.cars_by_terminal) {
      for (const arr of Object.values(c.cars_by_terminal)) {
        for (const car of arr) accumulate(map, car);
      }
    }
  }

  const cars = [...map.values()];
  if (cars.length === 0) return null;

  const byActivity: RankedListItem[] = [...cars]
    .sort((a, b) => (b.total_trips || 0) - (a.total_trips || 0))
    .slice(0, 15)
    .map((c) => ({
      id: `act-${c.car_no_plate}`,
      label: c.car_no_plate,
      sublabel: t('trips.statistics.cars.workingDays', {
        n: c.working_days,
      }),
      value: c.total_trips,
      valueLabel: `${formatNumber(c.total_trips, 0)}×`,
      countLabel: `${formatNumber(c.total_volume, 0)} L`,
    }));

  const byMonetary: RankedListItem[] = hasFinancialAccess
    ? [...cars]
        .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
        .slice(0, 15)
        .map((c) => ({
          id: `rev-${c.car_no_plate}`,
          label: c.car_no_plate,
          value: c.total_revenue,
          valueLabel: formatCompactCurrency(c.total_revenue),
          countLabel: t('trips.statistics.companies.tripsX', {
            count: c.total_trips,
          }),
        }))
    : [...cars]
        .sort((a, b) => (b.total_distance || 0) - (a.total_distance || 0))
        .slice(0, 15)
        .map((c) => ({
          id: `dist-${c.car_no_plate}`,
          label: c.car_no_plate,
          value: c.total_distance,
          valueLabel: `${formatNumber(c.total_distance, 0)} km`,
          countLabel: t('trips.statistics.companies.tripsX', {
            count: c.total_trips,
          }),
        }));

  return (
    <CollapsibleSection
      defaultOpen={false}
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
          <CarIcon className="h-4 w-4" />
        </div>
      }
      title={
        <div>
          <div className="text-sm font-semibold md:text-base">
            {t('trips.statistics.cars.title')}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('trips.statistics.cars.subtitle', { count: cars.length })}
          </div>
        </div>
      }
    >
      <div className="grid gap-6 p-4 md:p-5 lg:grid-cols-2">
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('trips.statistics.cars.byActivity')}
          </h4>
          <RankedList items={byActivity} />
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {hasFinancialAccess
              ? t('trips.statistics.cars.byRevenue')
              : t('trips.statistics.cars.byDistance')}
          </h4>
          <RankedList
            items={byMonetary}
            barClassName={hasFinancialAccess ? 'bg-success' : 'bg-primary'}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}

/**
 * Sum a car's contributions into the running aggregate map. The same plate
 * appearing under multiple routes / groups should accumulate, not overwrite.
 */
function accumulate(map: Map<string, CarStat>, car: CarStat): void {
  const existing = map.get(car.car_no_plate);
  if (!existing) {
    map.set(car.car_no_plate, { ...car });
    return;
  }
  existing.total_trips = (existing.total_trips || 0) + (car.total_trips || 0);
  existing.total_volume =
    (existing.total_volume || 0) + (car.total_volume || 0);
  existing.total_distance =
    (existing.total_distance || 0) + (car.total_distance || 0);
  existing.total_revenue =
    (existing.total_revenue || 0) + (car.total_revenue || 0);
  existing.working_days = Math.max(
    existing.working_days || 0,
    car.working_days || 0,
  );
}
