import type { TFunction } from 'i18next';
import { exportToExcel, EXCEL_PALETTE } from '@/shared/lib/excel';
import { fmtDate } from '@/shared/lib/format';
import type {
  CarTotalsRow,
  CompanyStat,
  DailyStat,
  GroupStat,
  RouteStat,
  TripStatisticsResponse,
} from '@/entities/trip-statistics/schemas';

interface ExportStatisticsArgs {
  data: TripStatisticsResponse;
  t: TFunction;
  /** Optional metadata line shown in the workbook header (e.g. date range) */
  meta?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type FlatGroupStat = GroupStat & { _company: string };
function flattenGroups(companies: CompanyStat[]): FlatGroupStat[] {
  const out: FlatGroupStat[] = [];
  for (const c of companies) {
    for (const g of c.details ?? []) {
      out.push({ ...g, _company: c.company });
    }
  }
  return out;
}

type FlatRouteStat = RouteStat & { _company: string };
function flattenRoutes(companies: CompanyStat[]): FlatRouteStat[] {
  const out: FlatRouteStat[] = [];
  for (const c of companies) {
    for (const r of c.route_details ?? []) {
      out.push({ ...r, _company: c.company });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Column builders                                                             */
/* -------------------------------------------------------------------------- */

function summaryColumns(t: TFunction) {
  return [
    {
      key: 'metric',
      header: t('trips.statistics.excel.metric'),
      accessor: (r: { metric: string; value: number | string }) => r.metric,
      width: 32,
    },
    {
      key: 'value',
      header: t('trips.statistics.excel.value'),
      accessor: (r: { metric: string; value: number | string }) => r.value,
      width: 22,
    },
  ];
}

function companyColumns(t: TFunction, hasFinancialAccess: boolean) {
  const base = [
    {
      key: 'company',
      header: t('trips.fields.company'),
      accessor: (c: CompanyStat) => c.company,
      width: 26,
    },
    {
      key: 'trips',
      header: t('trips.statistics.excel.cols.trips'),
      accessor: (c: CompanyStat) => c.total_trips,
      type: 'integer' as const,
      width: 12,
      total: true,
    },
    {
      key: 'volume',
      header: t('trips.statistics.excel.cols.volume'),
      accessor: (c: CompanyStat) => c.total_volume,
      type: 'number' as const,
      width: 16,
      total: true,
    },
    {
      key: 'distance',
      header: t('trips.statistics.excel.cols.distance'),
      accessor: (c: CompanyStat) => c.total_distance,
      type: 'number' as const,
      width: 14,
      total: true,
    },
  ];

  if (!hasFinancialAccess) return base;

  return [
    ...base,
    {
      key: 'revenue',
      header: t('trips.statistics.excel.cols.revenue'),
      accessor: (c: CompanyStat) => c.total_revenue,
      type: 'moneyRaw' as const,
      width: 16,
      total: true,
    },
    {
      key: 'vat',
      header: t('trips.statistics.excel.cols.vat'),
      accessor: (c: CompanyStat) => c.total_vat || 0,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'car_rent',
      header: t('trips.statistics.excel.cols.carRent'),
      accessor: (c: CompanyStat) => c.total_car_rent || 0,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'total_amount',
      header: t('trips.statistics.excel.cols.totalAmount'),
      accessor: (c: CompanyStat) => c.total_amount || c.total_revenue,
      type: 'moneyRaw' as const,
      width: 16,
      total: true,
    },
  ];
}

function groupColumns(t: TFunction, hasFinancialAccess: boolean) {
  const base = [
    {
      key: 'company',
      header: t('trips.fields.company'),
      accessor: (g: FlatGroupStat) => g._company,
      width: 22,
    },
    {
      key: 'group',
      header: t('trips.statistics.excel.cols.group'),
      accessor: (g: FlatGroupStat) => g.group_name,
      width: 28,
    },
    {
      key: 'trips',
      header: t('trips.statistics.excel.cols.trips'),
      accessor: (g: FlatGroupStat) => g.total_trips,
      type: 'integer' as const,
      width: 10,
      total: true,
    },
    {
      key: 'volume',
      header: t('trips.statistics.excel.cols.volume'),
      accessor: (g: FlatGroupStat) => g.total_volume,
      type: 'number' as const,
      width: 14,
      total: true,
    },
    {
      key: 'distance',
      header: t('trips.statistics.excel.cols.distance'),
      accessor: (g: FlatGroupStat) => g.total_distance,
      type: 'number' as const,
      width: 13,
      total: true,
    },
    {
      key: 'distinct_cars',
      header: t('trips.statistics.excel.cols.distinctCars'),
      accessor: (g: FlatGroupStat) => g.distinct_cars || 0,
      type: 'integer' as const,
      width: 12,
    },
    {
      key: 'distinct_days',
      header: t('trips.statistics.excel.cols.distinctDays'),
      accessor: (g: FlatGroupStat) => g.distinct_days || 0,
      type: 'integer' as const,
      width: 12,
    },
  ];

  if (!hasFinancialAccess) return base;

  return [
    ...base,
    {
      key: 'revenue',
      header: t('trips.statistics.excel.cols.revenue'),
      accessor: (g: FlatGroupStat) => g.total_revenue,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'total_with_vat',
      header: t('trips.statistics.excel.cols.totalWithVat'),
      accessor: (g: FlatGroupStat) => g.total_with_vat || g.total_revenue,
      type: 'moneyRaw' as const,
      width: 15,
      total: true,
    },
  ];
}

function routeColumns(t: TFunction, hasFinancialAccess: boolean) {
  const base = [
    {
      key: 'company',
      header: t('trips.fields.company'),
      accessor: (r: FlatRouteStat) => r._company,
      width: 22,
    },
    {
      key: 'route',
      header: t('trips.statistics.excel.cols.route'),
      accessor: (r: FlatRouteStat) => r.route_name,
      width: 36,
    },
    {
      key: 'route_type',
      header: t('trips.statistics.excel.cols.routeType'),
      accessor: (r: FlatRouteStat) => r.route_type ?? '',
      width: 16,
    },
    {
      key: 'trips',
      header: t('trips.statistics.excel.cols.trips'),
      accessor: (r: FlatRouteStat) => r.total_trips,
      type: 'integer' as const,
      width: 10,
      total: true,
    },
    {
      key: 'volume',
      header: t('trips.statistics.excel.cols.volume'),
      accessor: (r: FlatRouteStat) => r.total_volume,
      type: 'number' as const,
      width: 14,
      total: true,
    },
    {
      key: 'distance',
      header: t('trips.statistics.excel.cols.distance'),
      accessor: (r: FlatRouteStat) => r.total_distance,
      type: 'number' as const,
      width: 13,
      total: true,
    },
    {
      key: 'cars_count',
      header: t('trips.statistics.excel.cols.carsCount'),
      accessor: (r: FlatRouteStat) => r.cars?.length || 0,
      type: 'integer' as const,
      width: 11,
    },
  ];

  if (!hasFinancialAccess) return base;

  return [
    ...base,
    {
      key: 'revenue',
      header: t('trips.statistics.excel.cols.revenue'),
      accessor: (r: FlatRouteStat) => r.total_revenue,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'total_with_vat',
      header: t('trips.statistics.excel.cols.totalWithVat'),
      accessor: (r: FlatRouteStat) => r.total_with_vat || r.total_revenue,
      type: 'moneyRaw' as const,
      width: 15,
      total: true,
    },
  ];
}

/**
 * Cars sheet uses the top-level `carTotals` array from the response — the
 * backend already deduplicated by plate and pre-summed across every nesting
 * layer, so this is more accurate than walking the trees ourselves.
 */
function carTotalsColumns(t: TFunction, hasFinancialAccess: boolean) {
  const base = [
    {
      key: 'plate',
      header: t('trips.fields.vehicle'),
      accessor: (r: CarTotalsRow) => r.car_no_plate,
      width: 14,
    },
    {
      key: 'liters',
      header: t('trips.statistics.excel.cols.volume'),
      accessor: (r: CarTotalsRow) => r.liters,
      type: 'number' as const,
      width: 16,
      total: true,
    },
    {
      key: 'distance',
      header: t('trips.statistics.excel.cols.distance'),
      accessor: (r: CarTotalsRow) => r.distance,
      type: 'number' as const,
      width: 14,
      total: true,
    },
  ];

  if (!hasFinancialAccess) return base;

  return [
    ...base,
    {
      key: 'base_revenue',
      header: t('trips.statistics.excel.cols.revenue'),
      accessor: (r: CarTotalsRow) => r.base_revenue,
      type: 'moneyRaw' as const,
      width: 16,
      total: true,
    },
    {
      key: 'vat',
      header: t('trips.statistics.excel.cols.vat'),
      accessor: (r: CarTotalsRow) => r.vat,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'rent',
      header: t('trips.statistics.excel.cols.carRent'),
      accessor: (r: CarTotalsRow) => r.rent,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'total',
      header: t('trips.statistics.excel.cols.totalWithVat'),
      accessor: (r: CarTotalsRow) => r.base_revenue + r.vat,
      type: 'moneyRaw' as const,
      width: 16,
      total: true,
    },
  ];
}

function dailyColumns(t: TFunction, hasFinancialAccess: boolean) {
  const base = [
    {
      key: 'date',
      header: t('trips.fields.date'),
      accessor: (d: DailyStat) => (d.date ? new Date(d.date) : null),
      type: 'date' as const,
      width: 14,
    },
    {
      key: 'trips',
      header: t('trips.statistics.excel.cols.trips'),
      accessor: (d: DailyStat) => d.total_trips,
      type: 'integer' as const,
      width: 10,
      total: true,
    },
    {
      key: 'volume',
      header: t('trips.statistics.excel.cols.volume'),
      accessor: (d: DailyStat) => d.total_volume,
      type: 'number' as const,
      width: 14,
      total: true,
    },
    {
      key: 'distance',
      header: t('trips.statistics.excel.cols.distance'),
      accessor: (d: DailyStat) => d.total_distance,
      type: 'number' as const,
      width: 13,
      total: true,
    },
  ];

  if (!hasFinancialAccess) return base;

  return [
    ...base,
    {
      key: 'revenue',
      header: t('trips.statistics.excel.cols.revenue'),
      accessor: (d: DailyStat) => d.total_revenue,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Export full trip statistics as a multi-sheet Excel workbook:
 *
 *   1. Summary       — fleet-wide KPIs in label/value pairs
 *   2. Companies     — per-company aggregates with totals row
 *   3. Groups        — group-level aggregates flattened across companies
 *   4. Routes        — every route flattened (with route_type + cars count)
 *   5. Cars          — uses top-level `carTotals` (pre-aggregated by backend)
 *   6. Daily         — full daily timeline
 */
export async function exportTripStatistics({
  data,
  t,
  meta,
}: ExportStatisticsArgs): Promise<void> {
  const { data: companies, statsByDate, hasFinancialAccess, carTotals } = data;
  if (
    companies.length === 0 &&
    statsByDate.length === 0 &&
    carTotals.length === 0
  ) {
    return;
  }

  const flatGroups = flattenGroups(companies);
  const flatRoutes = flattenRoutes(companies);

  /* ---- Summary KPI rows ---- */

  const totals = companies.reduce(
    (acc, c) => ({
      trips: acc.trips + (c.total_trips || 0),
      volume: acc.volume + (c.total_volume || 0),
      distance: acc.distance + (c.total_distance || 0),
      revenue: acc.revenue + (c.total_revenue || 0),
      vat: acc.vat + (c.total_vat || 0),
      total_amount: acc.total_amount + (c.total_amount || c.total_revenue || 0),
    }),
    { trips: 0, volume: 0, distance: 0, revenue: 0, vat: 0, total_amount: 0 },
  );

  const summaryRows: Array<{ metric: string; value: number | string }> = [
    { metric: t('trips.statistics.kpi.totalTrips'), value: totals.trips },
    { metric: t('trips.statistics.kpi.totalVolume'), value: totals.volume },
    { metric: t('trips.statistics.kpi.totalDistance'), value: totals.distance },
    { metric: t('trips.statistics.kpi.companiesActive'), value: companies.length },
    { metric: t('trips.statistics.kpi.activeVehicles'), value: carTotals.length },
    {
      metric: t('trips.statistics.kpi.uniqueRoutes'),
      value: new Set(flatRoutes.map((r) => r.route_name)).size,
    },
  ];
  if (hasFinancialAccess) {
    summaryRows.push(
      { metric: t('trips.statistics.kpi.totalRevenue'), value: totals.revenue },
      { metric: t('trips.statistics.kpi.totalVat'), value: totals.vat },
      {
        metric: t('trips.statistics.kpi.totalWithVat'),
        value: totals.total_amount,
      },
    );
  }

  /* ---- Header stat pills ---- */

  const headerStats = [
    {
      label: t('trips.statistics.kpi.totalTrips'),
      value: totals.trips,
      type: 'number' as const,
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('trips.statistics.kpi.totalVolume'),
      value: Math.round(totals.volume * 100) / 100,
      type: 'number' as const,
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('trips.statistics.kpi.totalDistance'),
      value: Math.round(totals.distance * 100) / 100,
      type: 'number' as const,
      color: EXCEL_PALETTE.violet,
    },
    ...(hasFinancialAccess
      ? [
          {
            label: t('trips.statistics.kpi.totalRevenue'),
            value: Math.round(totals.revenue * 100) / 100,
            type: 'moneyRaw' as const,
            color: EXCEL_PALETTE.green,
          },
        ]
      : []),
  ];

  /* ---- Sort sheets for deterministic output ---- */

  const sortedCompanies = [...companies].sort((a, b) =>
    hasFinancialAccess
      ? (b.total_revenue || 0) - (a.total_revenue || 0)
      : (b.total_volume || 0) - (a.total_volume || 0),
  );
  const sortedGroups = [...flatGroups].sort(
    (a, b) => (b.total_volume || 0) - (a.total_volume || 0),
  );
  const sortedRoutes = [...flatRoutes].sort(
    (a, b) => (b.total_trips || 0) - (a.total_trips || 0),
  );
  const sortedCarTotals = [...carTotals].sort((a, b) =>
    hasFinancialAccess
      ? (b.base_revenue || 0) - (a.base_revenue || 0)
      : (b.liters || 0) - (a.liters || 0),
  );
  const sortedDaily = [...statsByDate].sort((a, b) =>
    (a.date || '').localeCompare(b.date || ''),
  );

  await exportToExcel({
    filename: 'trip-statistics',
    meta: meta ?? `${t('trips.statistics.title')} · ${fmtDate(new Date())}`,
    sheets: [
      {
        name: t('trips.statistics.excel.sheets.summary'),
        title: t('trips.statistics.excel.sheets.summary'),
        subtitle: meta,
        columns: summaryColumns(t),
        rows: summaryRows,
      },
      {
        name: t('trips.statistics.excel.sheets.companies'),
        title: t('trips.statistics.excel.sheets.companies'),
        columns: companyColumns(t, hasFinancialAccess),
        rows: sortedCompanies,
        stats: headerStats,
        totals: true,
      },
      ...(sortedGroups.length > 0
        ? [
            {
              name: t('trips.statistics.excel.sheets.groups'),
              title: t('trips.statistics.excel.sheets.groups'),
              columns: groupColumns(t, hasFinancialAccess),
              rows: sortedGroups,
              totals: true,
            },
          ]
        : []),
      ...(sortedRoutes.length > 0
        ? [
            {
              name: t('trips.statistics.excel.sheets.routes'),
              title: t('trips.statistics.excel.sheets.routes'),
              columns: routeColumns(t, hasFinancialAccess),
              rows: sortedRoutes,
              totals: true,
            },
          ]
        : []),
      ...(sortedCarTotals.length > 0
        ? [
            {
              name: t('trips.statistics.excel.sheets.cars'),
              title: t('trips.statistics.excel.sheets.cars'),
              columns: carTotalsColumns(t, hasFinancialAccess),
              rows: sortedCarTotals,
              totals: true,
            },
          ]
        : []),
      ...(sortedDaily.length > 0
        ? [
            {
              name: t('trips.statistics.excel.sheets.daily'),
              title: t('trips.statistics.excel.sheets.daily'),
              columns: dailyColumns(t, hasFinancialAccess),
              rows: sortedDaily,
              totals: true,
            },
          ]
        : []),
    ],
  });
}
