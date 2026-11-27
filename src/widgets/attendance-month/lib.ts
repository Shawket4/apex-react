import type { TFunction } from 'i18next';
import type { AttendanceCell, AttendanceMonth } from '@/entities/maintenance/schemas';
import { formatCairoTime } from '@/shared/lib/cairo';
import type { ExcelExportConfig } from '@/shared/lib/excel';

/* -------------------------------------------------------------------------- */
/* Garage attendance, as the office reads it                                   */
/*                                                                            */
/* The garage app marks the days; maint-rust works out late, hours and what    */
/* each day counts as. This file only turns those answers into colour and      */
/* text.                                                                       */
/* -------------------------------------------------------------------------- */

/** Soft fill + text per day kind. */
export const KIND_TONE: Record<string, string> = {
  present: 'bg-success/15 text-success',
  late: 'bg-warning/20 text-warning',
  absent: 'bg-destructive/15 text-destructive',
  leave: 'bg-primary/15 text-primary',
  sick: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  off: 'bg-muted text-muted-foreground',
  weekly_off: 'bg-muted/60 text-muted-foreground',
  unmarked: 'border border-dashed border-muted-foreground/40 text-muted-foreground',
  outside: 'text-muted-foreground/40',
  future: '',
};

const SHOWN = ['present', 'late', 'absent', 'leave', 'sick', 'off', 'weekly_off', 'unmarked'];

/** The short code of a day ("ح", "P"…); empty for a day that shows nothing. */
export function kindCode(kind: string, t: TFunction): string {
  return SHOWN.includes(kind) ? t(`attendance.code.${kind}`) : '';
}

/** "8h 15m" / "8 س 15 د". */
export function fmtMinutes(minutes: number | null | undefined, t: TFunction): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return t('attendance.duration.m', { m });
  if (m === 0) return t('attendance.duration.h', { h });
  return t('attendance.duration.hm', { h, m });
}

/** Hours with one decimal. */
export const hoursOf = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

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
  if (c.late_minutes > 0) parts.push(t('attendance.lateBy', { d: fmtMinutes(c.late_minutes, t) }));
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
  const subtitle = t('attendance.hours', {
    start: m.settings.work_start,
    end: m.settings.work_end,
    grace: m.settings.late_grace_minutes,
  });
  type Worker = AttendanceMonth['workers'][number];
  return {
    filename: `${t('attendance.exportFile')}-${m.month}`,
    sheets: [
      {
        name: t('attendance.sheetGrid'),
        title,
        subtitle,
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
              return k === 'weekly_off' || k === 'unmarked' ? '' : kindCode(k, t);
            },
            width: 4,
          })),
        ],
        rows: m.workers,
      },
      {
        name: t('attendance.sheetTotals'),
        title,
        subtitle,
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
            key: 'late',
            header: t('attendance.totals.late'),
            accessor: (w: Worker) => w.totals.late,
            type: 'integer',
            total: true,
          },
          {
            key: 'late_minutes',
            header: t('attendance.totals.lateMinutes'),
            accessor: (w: Worker) => w.totals.late_minutes,
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
            key: 'off',
            header: t('attendance.totals.off'),
            accessor: (w: Worker) => w.totals.off,
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
          {
            key: 'hours',
            header: t('attendance.totals.hours'),
            accessor: (w: Worker) => hoursOf(w.totals.worked_minutes),
            type: 'number',
            total: true,
          },
          {
            key: 'extra',
            header: t('attendance.totals.extra'),
            accessor: (w: Worker) => hoursOf(w.totals.extra_minutes),
            type: 'number',
            total: true,
          },
        ],
        rows: m.workers,
      },
    ],
  };
}
