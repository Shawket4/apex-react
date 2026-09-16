import type { TFunction } from 'i18next';
import { exportToExcel, type ExcelColumn } from '@/shared/lib/excel';
import type { ZoneScanResponse, ZoneViolation } from '@/entities/zone/schemas';
import { formatDwell } from './dwell';

/** Exports a manual scan's violations as the branded workbook. */
export async function exportZoneScanToExcel(
  t: TFunction,
  result: ZoneScanResponse,
): Promise<void> {
  const columns: ExcelColumn<ZoneViolation>[] = [
    {
      key: 'codename',
      header: t('zones.scanRange.columns.vehicle', 'Vehicle'),
      accessor: (r) => r.codename,
      width: 18,
    },
    {
      key: 'zone',
      header: t('zones.scanRange.columns.zone', 'Zone'),
      accessor: (r) => r.zone_name,
      width: 22,
    },
    {
      key: 'entry',
      header: t('zones.scanRange.columns.entry', 'In'),
      accessor: (r) => r.entry_local,
      width: 20,
    },
    {
      key: 'exit',
      header: t('zones.scanRange.columns.exit', 'Out'),
      accessor: (r) => r.exit_local,
      width: 20,
    },
    {
      key: 'dwell',
      header: t('zones.scanRange.columns.dwell', 'Dwell'),
      accessor: (r) => formatDwell(t, r.dwell_secs),
      width: 14,
    },
    {
      key: 'points',
      header: t('zones.scanRange.columns.points', 'Points'),
      accessor: (r) => r.point_count,
      type: 'integer',
      width: 10,
    },
    {
      key: 'center',
      header: t('zones.scanRange.columns.location', 'Zone center'),
      accessor: (r) => `${r.zone_lat.toFixed(5)}, ${r.zone_lng.toFixed(5)}`,
      width: 24,
    },
  ];

  await exportToExcel({
    filename: `dead-zone-report-${result.from}_${result.to}`,
    meta: `${result.from} → ${result.to}`,
    sheets: [
      {
        name: t('zones.scanRange.sheet', 'Violations'),
        title: t('zones.scanRange.reportTitle', 'Dead-zone report'),
        subtitle: `${result.from} → ${result.to}`,
        columns,
        rows: result.violations,
        stats: [
          {
            label: t('zones.scanRange.daysScanned', 'Days scanned'),
            value: result.days_scanned,
            type: 'number',
          },
          {
            label: t('zones.scanRange.vehiclesScanned', 'Vehicles scanned'),
            value: result.vehicles_scanned,
            type: 'number',
          },
          {
            label: t('zones.scanRange.violationsFound', 'Violations found'),
            value: result.violations_found,
            type: 'number',
          },
        ],
      },
    ],
  });
}
