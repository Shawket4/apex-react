import type { TFunction } from 'i18next';
import { exportToExcel, EXCEL_PALETTE, type ExcelColumn } from '@/shared/lib/excel';
import type { OilChangeView } from '@/entities/oil-change/schemas';
import { fmtDate } from '@/shared/lib/format';

interface ExportFleetArgs {
  rows: OilChangeView[];
  t: TFunction;
  meta?: string;
}

interface ExportHistoryArgs {
  rows: OilChangeView[];
  carNoPlate: string;
  t: TFunction;
}

/** Map a row's status to an Excel ARGB font colour for the kmRemaining cell */
function rowStatusColor(row: OilChangeView): string {
  switch (row.status) {
    case 'good':
      return EXCEL_PALETTE.green;
    case 'warning':
      return EXCEL_PALETTE.amber;
    case 'critical':
      return EXCEL_PALETTE.red;
  }
}

function buildColumns(t: TFunction): ExcelColumn<OilChangeView>[] {
  return [
    {
      key: 'plate',
      header: t('oilChanges.fields.carPlate'),
      accessor: (r) => r.car_no_plate,
      width: 16,
    },
    {
      key: 'date',
      header: t('oilChanges.fields.date'),
      accessor: (r) => new Date(r.date),
      type: 'date',
      width: 14,
    },
    {
      key: 'supervisor',
      header: t('oilChanges.fields.supervisor'),
      accessor: (r) => r.super_visor || '—',
      width: 18,
    },
    {
      key: 'driver',
      header: t('oilChanges.fields.driver'),
      accessor: (r) => r.driver_name || '—',
      width: 22,
    },
    {
      key: 'odometerAtChange',
      header: t('oilChanges.fields.odometerAtChange'),
      accessor: (r) => r.odometer_at_change,
      type: 'integer',
      width: 14,
    },
    {
      key: 'currentOdometer',
      header: t('oilChanges.fields.currentOdometer'),
      accessor: (r) => r.current_odometer,
      type: 'integer',
      width: 14,
    },
    {
      key: 'kmUsed',
      header: t('oilChanges.fields.kmUsed'),
      accessor: (r) => r.kmUsed,
      type: 'integer',
      width: 12,
    },
    {
      key: 'kmRemaining',
      header: t('oilChanges.fields.kmRemaining'),
      accessor: (r) => r.kmRemaining,
      type: 'integer',
      width: 14,
      fontColor: rowStatusColor,
    },
    {
      key: 'mileage',
      header: t('oilChanges.fields.mileage'),
      accessor: (r) => r.mileage,
      type: 'integer',
      width: 14,
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (r) => t(`oilChanges.status.${r.status}`),
      width: 12,
      fontColor: rowStatusColor,
    },
    {
      key: 'cost',
      header: t('oilChanges.fields.cost'),
      accessor: (r) => r.cost,
      type: 'moneyRaw',
      width: 14,
      total: true,
    },
  ];
}

function buildStats(rows: OilChangeView[], t: TFunction) {
  const good = rows.filter((r) => r.status === 'good').length;
  const warning = rows.filter((r) => r.status === 'warning').length;
  const critical = rows.filter((r) => r.status === 'critical').length;
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);

  return [
    {
      label: t('oilChanges.stats.totalVehicles'),
      value: rows.length,
      type: 'number' as const,
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('oilChanges.status.good'),
      value: good,
      type: 'number' as const,
      color: EXCEL_PALETTE.green,
    },
    {
      label: t('oilChanges.status.warning'),
      value: warning,
      type: 'number' as const,
      color: EXCEL_PALETTE.amber,
    },
    {
      label: t('oilChanges.status.critical'),
      value: critical,
      type: 'number' as const,
      color: EXCEL_PALETTE.red,
    },
    {
      label: t('oilChanges.stats.totalCost'),
      value: Math.round(totalCost * 100) / 100,
      type: 'moneyRaw' as const,
      color: EXCEL_PALETTE.brand,
    },
  ];
}

/** Full fleet board export — one sheet, latest-per-car set */
export async function exportOilChangesFleet({
  rows,
  t,
  meta,
}: ExportFleetArgs): Promise<void> {
  if (rows.length === 0) return;

  await exportToExcel({
    filename: 'oil-changes-fleet',
    meta: meta ?? `${rows.length} vehicles · Generated ${fmtDate(new Date())}`,
    sheets: [
      {
        name: t('oilChanges.title'),
        title: t('oilChanges.title'),
        subtitle: t('oilChanges.subtitle'),
        columns: buildColumns(t),
        rows,
        stats: buildStats(rows, t),
        totals: true,
      },
    ],
  });
}

/** Per-car history export — one sheet of every record for one plate */
export async function exportOilChangesHistory({
  rows,
  carNoPlate,
  t,
}: ExportHistoryArgs): Promise<void> {
  if (rows.length === 0) return;

  const slug =
    carNoPlate
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'car';

  await exportToExcel({
    filename: `oil-changes-${slug}`,
    meta: `${carNoPlate} · ${rows.length} records · Generated ${fmtDate(new Date())}`,
    sheets: [
      {
        name: carNoPlate.slice(0, 31),
        title: `${t('oilChanges.title')} — ${carNoPlate}`,
        subtitle: t('oilChanges.history.subtitle', { plate: carNoPlate }),
        columns: buildColumns(t),
        rows,
        stats: buildStats(rows, t),
        totals: true,
      },
    ],
  });
}
