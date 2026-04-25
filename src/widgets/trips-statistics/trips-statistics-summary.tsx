import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  Droplet,
  MapPin,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { StatCard } from '@/shared/ui/stat-card';
import {
  formatNumber,
  formatCurrency,
  daysBetween,
  parseISO,
  toDateOnly,
} from '@/shared/lib/format';
import {
  formatCompactCurrency,
  formatCompactNumber,
} from '@/shared/lib/format-number';
import type {
  CarTotalsRow,
  CompanyStat,
  DailyStat,
} from '@/entities/trip-statistics/schemas';

interface TripsStatisticsSummaryProps {
  companies: CompanyStat[];
  daily: DailyStat[];
  carTotals: CarTotalsRow[];
  hasFinancialAccess: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Top-of-page KPI grid.
 *
 * **Layout.** Desktop shows 5 cards (matches the fuel-events stats pattern).
 * Mobile/tablet show 6 — the extra "companies active" card is hidden at
 * `lg:` breakpoint via `lg:hidden`, mirroring how fuel-events handles its
 * overflow card.
 *
 * **Active vehicles count.** Comes straight from `carTotals.length` since
 * the backend already deduplicated by plate. No client-side aggregation.
 *
 * **Financial gating.** Revenue / VAT cards swap to volume-only metrics when
 * `hasFinancialAccess` is false so a non-financial user still gets a useful
 * view at the right slot count.
 *
 * **Number formatting.** All values use 2 decimals max via `formatNumber(v, 2)`
 * for raw values; currency uses 2dp natively. Compact values (used when the
 * StatCard's full value would overflow its width) use the formatCompact*
 * helpers and trigger the StatCard's hover-tooltip with the full number.
 */
export function TripsStatisticsSummary({
  companies,
  daily,
  carTotals,
  hasFinancialAccess,
  startDate,
  endDate,
}: TripsStatisticsSummaryProps) {
  const { t } = useTranslation();

  // Roll up totals across all companies. The Rust service already aggregates
  // per-company; we just sum once more for the dashboard-level numbers.
  const totals = companies.reduce(
    (acc, c) => ({
      trips: acc.trips + (c.total_trips || 0),
      volume: acc.volume + (c.total_volume || 0),
      distance: acc.distance + (c.total_distance || 0),
      revenue: acc.revenue + (c.total_revenue || 0),
      vat: acc.vat + (c.total_vat || 0),
      total_with_vat:
        acc.total_with_vat + (c.total_amount || c.total_revenue || 0),
    }),
    { trips: 0, volume: 0, distance: 0, revenue: 0, vat: 0, total_with_vat: 0 },
  );

  // Determine the spanned days for daily averages
  const start = parseISO(startDate ? toDateOnly(startDate) : null);
  const end = parseISO(endDate ? toDateOnly(endDate) : null);
  const days =
    start && end
      ? daysBetween(start, end)
      : daily.length > 0
        ? daily.length
        : 1;

  const safeDays = Math.max(1, days);
  const safeTrips = Math.max(1, totals.trips);

  // Unique routes count — deduped across companies
  const uniqueRoutes = new Set<string>();
  for (const c of companies) {
    for (const r of c.route_details ?? []) uniqueRoutes.add(r.route_name);
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label={t('trips.statistics.kpi.totalTrips')}
        value={{
          full: formatNumber(totals.trips, 0),
          compact: formatCompactNumber(totals.trips, 0),
        }}
        subvalue={t('trips.statistics.kpi.tripsPerDay', {
          n: formatNumber(totals.trips / safeDays, 2),
        })}
        icon={Truck}
        tone="primary"
      />

      <StatCard
        label={t('trips.statistics.kpi.totalVolume')}
        value={{
          full: `${formatNumber(totals.volume, 2)} L`,
          compact: `${formatCompactNumber(totals.volume, 1)} L`,
        }}
        subvalue={t('trips.statistics.kpi.volumePerDay', {
          n: formatCompactNumber(totals.volume / safeDays, 1),
        })}
        icon={Droplet}
        tone="primary"
      />

      <StatCard
        label={t('trips.statistics.kpi.totalDistance')}
        value={{
          full: `${formatNumber(totals.distance, 2)} km`,
          compact: `${formatCompactNumber(totals.distance, 1)} km`,
        }}
        subvalue={t('trips.statistics.kpi.distancePerTrip', {
          n: formatNumber(totals.distance / safeTrips, 2),
        })}
        icon={MapPin}
      />

      {hasFinancialAccess ? (
        <StatCard
          label={t('trips.statistics.kpi.totalRevenue')}
          value={{
            full: formatCurrency(totals.revenue),
            compact: formatCompactCurrency(totals.revenue),
          }}
          subvalue={t('trips.statistics.kpi.revenuePerTrip', {
            n: formatCurrency(totals.revenue / safeTrips),
          })}
          icon={DollarSign}
          tone="success"
        />
      ) : (
        <StatCard
          label={t('trips.statistics.kpi.uniqueRoutes')}
          value={formatNumber(uniqueRoutes.size, 0)}
          icon={MapPin}
        />
      )}

      {hasFinancialAccess ? (
        <StatCard
          label={t('trips.statistics.kpi.totalWithVat')}
          value={{
            full: formatCurrency(totals.total_with_vat),
            compact: formatCompactCurrency(totals.total_with_vat),
          }}
          subvalue={t('trips.statistics.kpi.vatLine', {
            n: formatCurrency(totals.vat),
          })}
          icon={TrendingUp}
          tone="success"
        />
      ) : (
        <StatCard
          label={t('trips.statistics.kpi.activeVehicles')}
          value={formatNumber(carTotals.length, 0)}
          icon={Truck}
        />
      )}

      {/*
        The "companies active" card is shown only on mobile/tablet. On lg+ we
        already have 5 cards (matching the desktop pattern from fuel-events)
        and don't want the row to wrap.
      */}
      <StatCard
        label={t('trips.statistics.kpi.companiesActive')}
        value={formatNumber(companies.length, 0)}
        subvalue={t('trips.statistics.kpi.daysSpanned', { n: days })}
        icon={Users}
        className="lg:hidden"
      />
    </div>
  );
}
