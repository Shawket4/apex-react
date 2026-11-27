import type { TFunction } from 'i18next';
import type { AttendanceCell, AttendanceMonth } from '@/entities/maintenance/schemas';
import { formatCairoTime } from '@/shared/lib/cairo';
import type { ExcelExportConfig } from '@/shared/lib/excel';

/* -------------------------------------------------------------------------- */
/* Garage attendance, as the office reads it                                   */
/*                                                                            */
/* The garage app marks the days (present, absent, leave, sick, with the       */
/* check-in and check-out times of a present day); maint-rust lays out the     */
/* month. The garage works every day: no hours, no lateness, no days off.      */
/* This file only turns those answers into colour and text.                    */
/* -------------------------------------------------------------------------- */

/** Soft fill + text per day kind. */
export const KIND_TONE: Record<string, string> = {
  present: 'bg-success/15 text-success',
  absent: 'bg-destructive/15 text-destructive',
  leave: 'bg-primary/15 text-primary',
  sick: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  unmarked: 'border border-dashed border-muted-foreground/40 text-muted-foreground',
  outside: 'text-muted-foreground/40',
  future: '',
};

export const SHOWN = ['present', 'absent', 'leave', 'sick', 'unmarked'];

/** The short code of a day ("ح", "P"…); empty for a day that shows nothing. */
export function kindCode(kind: string, t: TFunction): string {
  return SHOWN.includes(kind) ? t(`attendance.code.${kind}`) : '';
}

/** YYYY-MM moved by `n` months. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** What a square says when pointed at. */
export function cellTitle(c: AttendanceCell, date: string, t: TFunction, language: string): string {
  const parts = [date, t(`attendance.status.${c.kind}`)];
  if (c.check_in_at)
    parts.push(t('attendance.inAt', { time: formatCairoTime(c.check_in_at, language) }));
  if (c.check_out_at)
    parts.push(t('attendance.outAt', { time: formatCairoTime(c.check_out_at, language) }));
  if (c.note) parts.push(`“${c.note}”`);
  if (c.marked_by) parts.push(t('attendance.markedBy', { name: c.marked_by }));
  return parts.join(' · ');
}

/** Two sheets: the month's codes, and the totals per worker. */
export function attendanceExcel(
  m: AttendanceMonth,
  title: string,
  t: TFunction,
): ExcelExportConfig {
  type Worker = AttendanceMonth['workers'][number];
  return {
    filename: `${t('attendance.exportFile')}-${m.month}`,
    sheets: [
      {
        name: t('attendance.sheetGrid'),
        title,
        columns: [
          {
            key: 'worker',
            header: t('attendance.worker'),
            accessor: (w: Worker) => w.name,
            width: 24,
          },
          ...m.days.map((d, i) => ({
            key: `d${d.day}`,
            header: String(d.day),
            accessor: (w: Worker) => {
              const k = w.cells[i]?.kind ?? '';
              return k === 'unmarked' ? '' : kindCode(k, t);
            },
            width: 4,
          })),
        ],
        rows: m.workers,
      },
      {
        name: t('attendance.sheetTotals'),
        title,
        totals: true,
        columns: [
          {
            key: 'worker',
            header: t('attendance.worker'),
            accessor: (w: Worker) => w.name,
            width: 24,
          },
          {
            key: 'job',
            header: t('attendance.job'),
            accessor: (w: Worker) => w.job ?? '',
            width: 18,
          },
          {
            key: 'present',
            header: t('attendance.totals.present'),
            accessor: (w: Worker) => w.totals.present,
            type: 'integer',
            total: true,
          },
          {
            key: 'absent',
            header: t('attendance.totals.absent'),
            accessor: (w: Worker) => w.totals.absent,
            type: 'integer',
            total: true,
          },
          {
            key: 'leave',
            header: t('attendance.totals.leave'),
            accessor: (w: Worker) => w.totals.leave,
            type: 'integer',
            total: true,
          },
          {
            key: 'sick',
            header: t('attendance.totals.sick'),
            accessor: (w: Worker) => w.totals.sick,
            type: 'integer',
            total: true,
          },
          {
            key: 'unmarked',
            header: t('attendance.totals.unmarked'),
            accessor: (w: Worker) => w.totals.unmarked,
            type: 'integer',
            total: true,
          },
        ],
        rows: m.workers,
      },
    ],
  };
}
