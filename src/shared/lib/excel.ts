/**
 * Central Excel export service.
 *
 * Every exportable table in the app calls `exportToExcel(config)` with a
 * declarative column spec. The service handles:
 *   - Branded banner (optional logo, title, subtitle, timestamp)
 *   - Optional stat pills row (e.g. "Total Spend: 1,234 EGP")
 *   - Header row with brand colour
 *   - Zebra-striped data rows
 *   - Automatic column widths, typed formatters (money/number/date/text)
 *   - Totals row (SUM formulas over numeric columns)
 *   - Locale-aware number/currency formatting
 *   - Lazy ExcelJS import — no bundle cost until user clicks Export
 */

import { toast } from 'sonner';
import i18n from '@/shared/i18n';

// ── Column types ─────────────────────────────────────────────────────────────

export type ColumnType =
    | 'text'
    | 'number'
    | 'money' // piastres / cents → divided by 100
    | 'moneyRaw' // already in base currency, no division
    | 'integer'
    | 'percent' // 0.0–1.0
    | 'date'
    | 'dateTime'
    | 'bool';

export interface ExcelColumn<T> {
    key: string;
    header: string;
    /** How to pick a value from the row */
    accessor: (row: T) => string | number | Date | boolean | null | undefined;
    type?: ColumnType;
    width?: number;
    /** Optional per-row colour override for the cell font (ARGB) */
    fontColor?: (row: T) => string | undefined;
    /** Include this column in the totals row (auto SUM) */
    total?: boolean;
}

export interface ExcelStat {
    label: string;
    value: number | string;
    /** ARGB colour for the value text */
    color?: string;
    type?: 'money' | 'moneyRaw' | 'number' | 'text';
}

export interface ExcelSheetConfig<T> {
    /** Sheet tab name (<=31 chars, no : \ / ? * [ ]) */
    name: string;
    /** Title shown in the banner */
    title: string;
    /** Optional subtitle shown below the banner title */
    subtitle?: string;
    columns: ExcelColumn<T>[];
    rows: T[];
    stats?: ExcelStat[];
    totals?: boolean;
}

export interface ExcelExportConfig {
    /** Final file name (without extension) */
    filename: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheets: ExcelSheetConfig<any>[];
    /** Optional logo path relative to public dir */
    logoUrl?: string;
    /** Optional meta shown under subtitle (e.g. "Branch: X · Range: A → B") */
    meta?: string;
    /** Override workbook creator metadata */
    creator?: string;
}

// ── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = {
    brand: 'FF1E40AF', // petrol blue — matches Apex primary
    brandLight: 'FF3B6FE0',
    white: 'FFFFFFFF',
    rowEven: 'FFF9FAFB',
    border: 'FFE5E7EB',
    text: 'FF111827',
    muted: 'FF6B7280',
    green: 'FF16A34A',
    red: 'FFDC2626',
    amber: 'FFD97706',
    violet: 'FF7C3AED',
};

export const EXCEL_PALETTE = PALETTE;

// ── Formatters ───────────────────────────────────────────────────────────────

const numFmtFor = (type: ColumnType | undefined): string | undefined => {
    switch (type) {
        case 'money':
        case 'moneyRaw':
            return '#,##0.00 "EGP"';
        case 'number':
            return '#,##0.00';
        case 'integer':
            return '#,##0';
        case 'percent':
            return '0.0%';
        case 'date':
            return 'dd mmm yyyy';
        case 'dateTime':
            return 'dd mmm yyyy hh:mm';
        default:
            return undefined;
    }
};

const coerceValue = (raw: unknown, type: ColumnType | undefined): unknown => {
    if (raw == null) return null;
    switch (type) {
        case 'money':
            return typeof raw === 'number' ? raw / 100 : 0;
        case 'moneyRaw':
        case 'number':
        case 'integer':
        case 'percent':
            return typeof raw === 'number' ? raw : Number(raw) || 0;
        case 'date':
        case 'dateTime':
            return raw instanceof Date ? raw : new Date(String(raw));
        case 'bool':
            return raw ? '✓' : '—';
        default:
            return raw;
    }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const columnLetter = (idx: number): string => {
    let n = idx;
    let s = '';
    do {
        s = String.fromCharCode(65 + (n % 26)) + s;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
};

const cleanSheetName = (name: string): string =>
    name.replace(/[:\\/?*[\]]/g, '').slice(0, 31);

// ── Main export ──────────────────────────────────────────────────────────────

export async function exportToExcel(config: ExcelExportConfig): Promise<void> {
    const t = i18n.getFixedT(null, 'translation');

    const nothingToExport = config.sheets.every((s) => s.rows.length === 0);
    if (nothingToExport) {
        toast.error(t('excel.nothingToExport'));
        return;
    }

    const toastId = toast.loading(t('excel.generating'));

    try {
        const ExcelJSMod = await import('exceljs');
        const ExcelJS =
            (ExcelJSMod as unknown as { default?: typeof import('exceljs') }).default ??
            (ExcelJSMod as unknown as typeof import('exceljs'));
        const wb = new ExcelJS.Workbook();
        wb.creator = config.creator ?? 'Apex Fleet';
        wb.created = new Date();

        // Preload logo once if any sheet will use it
        let logoId: number | undefined;
        if (config.logoUrl) {
            try {
                const res = await fetch(config.logoUrl);
                if (res.ok) {
                    const buf = await res.arrayBuffer();
                    const ext = config.logoUrl.toLowerCase().endsWith('.jpg') ? 'jpeg' : 'png';
                    logoId = wb.addImage({ buffer: buf, extension: ext });
                }
            } catch {
                /* logo optional */
            }
        }

        for (const sheet of config.sheets) {
            buildSheet(wb, sheet, config.meta, logoId);
        }

        toast.loading(t('excel.downloading'), { id: toastId });

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.filename}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);

        const total = config.sheets.reduce((sum, s) => sum + s.rows.length, 0);
        toast.success(t('excel.done', { count: total }), { id: toastId });
    } catch (err) {
        console.error('Excel export failed', err);
        toast.error(t('excel.failed'), { id: toastId });
    }
}

// ── Sheet builder ────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function buildSheet<T>(
    wb: any,
    sheet: ExcelSheetConfig<T>,
    meta: string | undefined,
    logoId: number | undefined,
): void {
    const ws = wb.addWorksheet(cleanSheetName(sheet.name), {
        pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape' },
        views: [{ state: 'frozen', ySplit: 7 }],
    });

    ws.columns = sheet.columns.map((c) => ({ key: c.key, width: c.width ?? 18 }));
    const lastCol = columnLetter(sheet.columns.length - 1);

    // ── Banner (rows 1-3) ──────────────────────────────────────────────────────
    ws.mergeCells(`A1:${lastCol}1`);
    ws.getRow(1).height = logoId !== undefined ? 65 : 40;
    const titleCell = ws.getCell('A1');
    titleCell.value = sheet.title;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: PALETTE.brand } };
    titleCell.alignment = {
        horizontal: logoId !== undefined ? 'right' : 'center',
        vertical: 'middle',
        indent: logoId !== undefined ? 2 : 0,
    };

    if (logoId !== undefined) {
        ws.addImage(logoId, { tl: { col: 0.2, row: 0.35 }, ext: { width: 135, height: 57 } });
    }

    ws.mergeCells(`A2:${lastCol}2`);
    const subCell = ws.getCell('A2');
    const subParts: string[] = [];
    if (sheet.subtitle) subParts.push(sheet.subtitle);
    if (meta) subParts.push(meta);
    subParts.push(`Generated: ${new Date().toLocaleString('en-GB')}`);
    subCell.value = subParts.join(' · ');
    subCell.font = { name: 'Calibri', size: 9, color: { argb: PALETTE.muted } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 20;

    ws.mergeCells(`A3:${lastCol}3`);
    ws.getRow(3).height = 8;

    // ── Stats (rows 4-5) ───────────────────────────────────────────────────────
    if (sheet.stats && sheet.stats.length > 0) {
        const cellsPerStat = Math.max(1, Math.floor(sheet.columns.length / sheet.stats.length));
        sheet.stats.forEach((stat, idx) => {
            const startIdx = idx * cellsPerStat;
            const endIdx = Math.min(startIdx + cellsPerStat - 1, sheet.columns.length - 1);
            const startLetter = columnLetter(startIdx);
            const endLetter = columnLetter(endIdx);

            ws.mergeCells(`${startLetter}4:${endLetter}4`);
            const lc = ws.getCell(`${startLetter}4`);
            lc.value = stat.label;
            lc.font = { name: 'Calibri', size: 8, color: { argb: PALETTE.muted } };
            lc.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(`${startLetter}5:${endLetter}5`);
            const vc = ws.getCell(`${startLetter}5`);
            vc.value = stat.value;
            vc.font = {
                name: 'Calibri',
                size: 12,
                bold: true,
                color: { argb: stat.color ?? PALETTE.brand },
            };
            vc.alignment = { horizontal: 'center', vertical: 'middle' };
            if (stat.type === 'money' || stat.type === 'moneyRaw') vc.numFmt = '#,##0.00 "EGP"';
            else if (stat.type === 'number') vc.numFmt = '#,##0';
        });
        ws.mergeCells(`A6:${lastCol}6`);
        ws.getRow(6).height = 8;
    } else {
        ws.getRow(4).height = 0.1;
        ws.getRow(5).height = 0.1;
        ws.getRow(6).height = 8;
    }

    // ── Header row (row 7) ─────────────────────────────────────────────────────
    const headerRow = ws.addRow(sheet.columns.map((c) => c.header));
    headerRow.height = 30;
    headerRow.eachCell((cell: any) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.white } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.brand } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(cell);
    });

    // ── Data rows ──────────────────────────────────────────────────────────────
    const dataStart = 8;
    sheet.rows.forEach((row, idx) => {
        const values = sheet.columns.map((c) => coerceValue(c.accessor(row), c.type));
        const excelRow = ws.addRow(values);
        excelRow.height = 22;
        excelRow.eachCell({ includeEmpty: true }, (cell: any, colNum: number) => {
            const colDef = sheet.columns[colNum - 1];
            const fontColor = colDef?.fontColor?.(row) ?? PALETTE.text;
            cell.font = { name: 'Calibri', size: 10, color: { argb: fontColor } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: idx % 2 === 0 ? PALETTE.rowEven : PALETTE.white },
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            applyBorder(cell);
            const fmt = numFmtFor(colDef?.type);
            if (fmt) cell.numFmt = fmt;
        });
    });

    // ── Totals row ─────────────────────────────────────────────────────────────
    if (sheet.totals && sheet.rows.length > 0) {
        const totalValues = sheet.columns.map((c, i) => {
            if (!c.total) return i === 0 ? 'TOTALS' : '';
            const letter = columnLetter(i);
            return {
                formula: `SUM(${letter}${dataStart}:${letter}${dataStart + sheet.rows.length - 1})`,
            };
        });
        const totalsRow = ws.addRow(totalValues);
        totalsRow.height = 28;
        totalsRow.eachCell({ includeEmpty: true }, (cell: any, colNum: number) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.brand } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PALETTE.white } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            applyBorder(cell);
            const fmt = numFmtFor(sheet.columns[colNum - 1]?.type);
            if (fmt) cell.numFmt = fmt;
        });
    }
}

function applyBorder(cell: any): void {
    const side = { style: 'thin' as const, color: { argb: PALETTE.border } };
    cell.border = { top: side, bottom: side, left: side, right: side };
}
/* eslint-enable @typescript-eslint/no-explicit-any */