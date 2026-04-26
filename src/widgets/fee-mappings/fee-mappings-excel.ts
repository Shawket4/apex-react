import i18n from '@/shared/i18n';
import {
  exportToExcel,
  type ExcelColumn,
  type ExcelStat,
  EXCEL_PALETTE,
} from '@/shared/lib/excel';
import { isValidCoordinate } from '@/shared/lib/coords';
import {
  calculateAccuracy,
  type FeeMapping,
} from '@/entities/fee-mapping/schemas';

/* -------------------------------------------------------------------------- */
/* Row shape — flatten the FeeMapping + computed accuracy into a single row   */
/* the Excel column accessors can read from.                                  */
/* -------------------------------------------------------------------------- */

interface FeeMappingExcelRow {
  company: string;
  terminal: string;
  dropOffPoint: string;
  distance: number;
  osrmDistanceKm: number | null;
  osrmDurationMin: number | null;
  diffKm: number | null;
  accuracyLabel: string;
  fee: number;
  located: string;
  /** Carry the raw accuracy kind through so we can colour the cell */
  accuracyKind: 'accurate' | 'conservative' | 'overestimate' | 'unknown';
}

function rowsFromMappings(mappings: FeeMapping[]): FeeMappingExcelRow[] {
  const t = i18n.getFixedT(null, 'translation');
  return mappings.map((m) => {
    const { kind, diffKm, percentage } = calculateAccuracy(m.distance, m.osrmDistanceKm);
    const accuracyLabel =
      kind === 'unknown'
        ? t('feeMappings.accuracy.unknown')
        : `${t(`feeMappings.accuracy.${kind}`)} (${diffKm > 0 ? '+' : ''}${diffKm.toFixed(2)} km, ${percentage}%)`;
    return {
      company: m.company,
      terminal: m.terminal,
      dropOffPoint: m.dropOffPoint,
      distance: m.distance,
      osrmDistanceKm: m.osrmDistanceKm,
      osrmDurationMin: m.osrmDurationMin,
      diffKm: m.osrmDistanceKm != null ? diffKm : null,
      accuracyLabel,
      fee: m.fee,
      located: isValidCoordinate(m.lat, m.lng) ? '✓' : '—',
      accuracyKind: kind,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Column definitions                                                         */
/* -------------------------------------------------------------------------- */

function buildColumns(): ExcelColumn<FeeMappingExcelRow>[] {
  const t = i18n.getFixedT(null, 'translation');
  return [
    {
      key: 'company',
      header: t('feeMappings.fields.company'),
      accessor: (r) => r.company,
      type: 'text',
      width: 22,
    },
    {
      key: 'terminal',
      header: t('feeMappings.fields.terminal'),
      accessor: (r) => r.terminal,
      type: 'text',
      width: 22,
    },
    {
      key: 'dropOffPoint',
      header: t('feeMappings.fields.dropOffPoint'),
      accessor: (r) => r.dropOffPoint,
      type: 'text',
      width: 26,
    },
    {
      key: 'distance',
      header: t('feeMappings.fields.distance'),
      accessor: (r) => r.distance,
      type: 'number',
      width: 18,
      total: true,
    },
    {
      key: 'osrmDistance',
      header: t('feeMappings.fields.osrmDistance'),
      accessor: (r) => r.osrmDistanceKm,
      type: 'number',
      width: 18,
    },
    {
      key: 'osrmDuration',
      header: t('feeMappings.fields.osrmDuration'),
      accessor: (r) => r.osrmDurationMin,
      type: 'number',
      width: 18,
    },
    {
      key: 'diff',
      header: t('feeMappings.excel.discrepancy'),
      accessor: (r) => r.diffKm,
      type: 'number',
      width: 18,
      // Tint the discrepancy by sign — green when conservative (we under-
      // bill), red when we overestimate (we overbill OSRM-relative)
      fontColor: (r) => {
        if (r.diffKm == null) return undefined;
        if (Math.abs(r.diffKm) <= 0.5) return EXCEL_PALETTE.muted;
        return r.diffKm > 0 ? EXCEL_PALETTE.red : EXCEL_PALETTE.green;
      },
    },
    {
      key: 'accuracy',
      header: t('feeMappings.fields.accuracy'),
      accessor: (r) => r.accuracyLabel,
      type: 'text',
      width: 28,
      fontColor: (r) => {
        switch (r.accuracyKind) {
          case 'accurate':
            return EXCEL_PALETTE.green;
          case 'conservative':
            return EXCEL_PALETTE.brand;
          case 'overestimate':
            return EXCEL_PALETTE.red;
          default:
            return EXCEL_PALETTE.muted;
        }
      },
    },
    {
      key: 'fee',
      header: t('feeMappings.fields.fee'),
      accessor: (r) => r.fee,
      // Backend returns fee in EGP (not piastres) per the legacy code — use moneyRaw
      type: 'moneyRaw',
      width: 16,
      total: true,
    },
    {
      key: 'located',
      header: t('feeMappings.excel.located'),
      accessor: (r) => r.located,
      type: 'text',
      width: 10,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Stats pills — shown in the banner row                                       */
/* -------------------------------------------------------------------------- */

function buildStats(rows: FeeMappingExcelRow[]): ExcelStat[] {
  const t = i18n.getFixedT(null, 'translation');
  let accurate = 0;
  let conservative = 0;
  let overestimate = 0;
  let unknown = 0;
  let totalFee = 0;
  for (const r of rows) {
    if (r.accuracyKind === 'accurate') accurate++;
    else if (r.accuracyKind === 'conservative') conservative++;
    else if (r.accuracyKind === 'overestimate') overestimate++;
    else unknown++;
    totalFee += r.fee;
  }
  return [
    {
      label: t('feeMappings.stats.total'),
      value: rows.length,
      type: 'number',
      color: EXCEL_PALETTE.brand,
    },
    {
      label: t('feeMappings.stats.accurate'),
      value: accurate,
      type: 'number',
      color: EXCEL_PALETTE.green,
    },
    {
      label: t('feeMappings.stats.conservative'),
      value: conservative,
      type: 'number',
      color: EXCEL_PALETTE.brandLight,
    },
    {
      label: t('feeMappings.stats.overestimate'),
      value: overestimate,
      type: 'number',
      color: EXCEL_PALETTE.red,
    },
    {
      label: t('feeMappings.excel.totalFee'),
      value: totalFee,
      type: 'moneyRaw',
      color: EXCEL_PALETTE.violet,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                          */
/* -------------------------------------------------------------------------- */

export interface ExportOpts {
  filterMeta?: string;
}

/**
 * Export the (filtered) fee mappings list to xlsx via the shared helper.
 *
 * The shared helper handles banner / stats pills / zebra rows / totals
 * row uniformly across the app, so this file is reduced to a column-spec
 * declaration plus row flattening — no more bespoke ExcelJS code.
 */
export async function exportFeeMappingsExcel(
  mappings: FeeMapping[],
  opts: ExportOpts = {},
): Promise<void> {
  const t = i18n.getFixedT(null, 'translation');
  const rows = rowsFromMappings(mappings);

  await exportToExcel({
    filename: 'fee-mappings',
    meta: opts.filterMeta,
    sheets: [
      {
        name: t('feeMappings.excel.sheetName'),
        title: t('feeMappings.pageTitle'),
        subtitle: t('feeMappings.pageSubtitle'),
        columns: buildColumns(),
        rows,
        stats: buildStats(rows),
        totals: true,
      },
    ],
  });
}
