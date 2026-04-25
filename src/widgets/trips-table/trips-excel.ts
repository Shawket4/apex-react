import type { TFunction } from 'i18next';
import { exportToExcel, EXCEL_PALETTE } from '@/shared/lib/excel';
import type { Trip } from '@/entities/trip/schemas';
import { fmtDate } from '@/shared/lib/format';

interface ExportTripsArgs {
  trips: Trip[];
  t: TFunction;
  meta?: string;
}

/**
 * Build the column spec for the trips export.
 *
 * Receipt-tracking columns ('inGarage' / 'inOffice' / 'stamped') are derived
 * by walking each trip's receipt_steps. Yes/No is rendered with green / muted
 * font colour to match the original module's visual conventions.
 */
function buildColumns(t: TFunction) {
  return [
    {
      key: 'receipt_no',
      header: t('trips.fields.receiptNo'),
      accessor: (e: Trip) => e.receipt_no || '—',
      width: 14,
    },
    {
      key: 'date',
      header: t('trips.fields.date'),
      accessor: (e: Trip) => (e.date ? new Date(e.date) : null),
      type: 'date' as const,
      width: 13,
    },
    {
      key: 'company',
      header: t('trips.fields.company'),
      accessor: (e: Trip) => e.company || '—',
      width: 22,
    },
    {
      key: 'terminal',
      header: t('trips.fields.terminal'),
      accessor: (e: Trip) => e.terminal || '—',
      width: 22,
    },
    {
      key: 'drop_off_point',
      header: t('trips.fields.dropOffPoint'),
      accessor: (e: Trip) => e.drop_off_point || '—',
      width: 24,
    },
    {
      key: 'car_no_plate',
      header: t('trips.fields.vehicle'),
      accessor: (e: Trip) => e.car_no_plate,
      width: 14,
    },
    {
      key: 'driver_name',
      header: t('trips.fields.driver'),
      accessor: (e: Trip) => e.driver_name,
      width: 22,
    },
    {
      key: 'tank_capacity',
      header: t('trips.fields.tankCapacity'),
      accessor: (e: Trip) => e.tank_capacity || 0,
      type: 'integer' as const,
      width: 14,
      total: true,
    },
    {
      key: 'distance',
      header: t('trips.fields.distance'),
      accessor: (e: Trip) => e.mileage || e.distance || 0,
      type: 'number' as const,
      width: 13,
      total: true,
    },
    {
      key: 'fee',
      header: t('trips.fields.fee'),
      accessor: (e: Trip) => e.fee || 0,
      type: 'moneyRaw' as const,
      width: 14,
      total: true,
    },
    {
      key: 'in_garage',
      header: t('trips.fields.inGarage'),
      accessor: (e: Trip) =>
        e.receipt_steps?.some((s) => s.location === 'Garage') ? 'Yes' : 'No',
      width: 11,
      fontColor: (e: Trip) =>
        e.receipt_steps?.some((s) => s.location === 'Garage')
          ? EXCEL_PALETTE.green
          : EXCEL_PALETTE.muted,
    },
    {
      key: 'in_office',
      header: t('trips.fields.inOffice'),
      accessor: (e: Trip) =>
        e.receipt_steps?.some((s) => s.location === 'Office') ? 'Yes' : 'No',
      width: 11,
      fontColor: (e: Trip) =>
        e.receipt_steps?.some((s) => s.location === 'Office')
          ? EXCEL_PALETTE.green
          : EXCEL_PALETTE.muted,
    },
    {
      key: 'stamped',
      header: t('trips.fields.stamped'),
      accessor: (e: Trip) =>
        e.receipt_steps?.some((s) => s.stamped) ? 'Yes' : 'No',
      width: 11,
      fontColor: (e: Trip) =>
        e.receipt_steps?.some((s) => s.stamped)
          ? EXCEL_PALETTE.green
          : EXCEL_PALETTE.muted,
    },
    {
      key: 'garage_received_by',
      header: t('trips.fields.garageReceivedBy'),
      accessor: (e: Trip) =>
        e.receipt_steps?.find((s) => s.location === 'Garage')?.received_by ?? '',
      width: 18,
    },
    {
      key: 'garage_date',
      header: t('trips.fields.garageDate'),
      accessor: (e: Trip) => {
        const at = e.receipt_steps?.find((s) => s.location === 'Garage')
          ?.received_at;
        return at ? new Date(at) : null;
      },
      type: 'dateTime' as const,
      width: 17,
    },
    {
      key: 'office_received_by',
      header: t('trips.fields.officeReceivedBy'),
      accessor: (e: Trip) =>
        e.receipt_steps?.find((s) => s.location === 'Office')?.received_by ?? '',
      width: 18,
    },
    {
      key: 'office_date',
      header: t('trips.fields.officeDate'),
      accessor: (e: Trip) => {
        const at = e.receipt_steps?.find((s) => s.location === 'Office')
          ?.received_at;
        return at ? new Date(at) : null;
      },
      type: 'dateTime' as const,
      width: 17,
    },
  ];
}

/**
 * Aggregate KPIs shown in the banner stat pills.
 */
function buildStats(trips: Trip[], t: TFunction) {
  const totalCapacity = trips.reduce(
    (sum, e) => sum + (e.tank_capacity || 0),
    0,
  );
  const totalDistance = trips.reduce(
    (sum, e) => sum + (e.mileage || e.distance || 0),
    0,
  );
  const totalFees = trips.reduce((sum, e) => sum + (e.fee || 0), 0);
  const stamped = trips.filter((e) =>
    e.receipt_steps?.some((s) => s.stamped),
  ).length;

  return [
    {
      label: t('trips.stats.totalTrips'),
      value: trips.length,
      type: 'number' as const,
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('trips.stats.totalVolume'),
      value: Math.round(totalCapacity * 100) / 100,
      type: 'number' as const,
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('trips.stats.totalDistance'),
      value: Math.round(totalDistance * 100) / 100,
      type: 'number' as const,
      color: EXCEL_PALETTE.violet,
    },
    {
      label: t('trips.stats.totalFees'),
      value: Math.round(totalFees * 100) / 100,
      type: 'moneyRaw' as const,
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('trips.stats.stamped'),
      value: stamped,
      type: 'number' as const,
      color: EXCEL_PALETTE.green,
    },
  ];
}

/**
 * Sort trips for the export — by date desc, then company, then receipt no.
 * Stable, deterministic, mirrors what the original module produced so any
 * downstream macros / pivots stay compatible.
 */
function sortForExport(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const dateCmp = (b.date || '').localeCompare(a.date || '');
    if (dateCmp !== 0) return dateCmp;
    const companyCmp = (a.company || '').localeCompare(b.company || '');
    if (companyCmp !== 0) return companyCmp;
    return (a.receipt_no || '').localeCompare(b.receipt_no || '');
  });
}

export async function exportTrips({
  trips,
  t,
  meta,
}: ExportTripsArgs): Promise<void> {
  if (trips.length === 0) return;

  const sorted = sortForExport(trips);

  await exportToExcel({
    filename: 'trips',
    meta: meta ?? `${trips.length} trips · ${fmtDate(new Date())}`,
    sheets: [
      {
        name: t('trips.title'),
        title: t('trips.title'),
        subtitle: t('trips.subtitle'),
        columns: buildColumns(t),
        rows: sorted,
        stats: buildStats(sorted, t),
        totals: true,
      },
    ],
  });
}
