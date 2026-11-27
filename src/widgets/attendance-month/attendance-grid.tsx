import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { AttendanceMonth, AttendanceTotals } from '@/entities/maintenance/schemas';
import { formatCairoDay } from '@/shared/lib/cairo';
import { cn } from '@/shared/lib/cn';
import { KIND_TONE, SHOWN, cellTitle, kindCode } from './lib';

const PINNED: { key: keyof AttendanceTotals; label: string; tone: string }[] = [
  { key: 'present', label: 'attendance.totals.present', tone: 'text-success' },
  { key: 'absent', label: 'attendance.totals.absent', tone: 'text-destructive' },
  { key: 'leave', label: 'attendance.totals.leave', tone: 'text-primary' },
  { key: 'sick', label: 'attendance.totals.sick', tone: 'text-violet-600 dark:text-violet-400' },
];
const LAST = PINNED.length - 1;

/**
 * The month as the garage marked it: workers down, days across. The name and
 * the month's totals stay put while the days scroll; the grid opens on today.
 */
export function AttendanceGrid({ month }: { month: AttendanceMonth }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const scroller = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>('[data-today]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [month.month]);

  // The name always stays put; the totals join it from tablet width up (on a
  // phone they would cover every day).
  const pinned = 'sticky z-10 bg-card';
  const pinnedWide = 'bg-card md:sticky md:z-10';
  const at = (rem: number): React.CSSProperties => ({ insetInlineStart: `${rem}rem` });

  return (
    <div ref={scroller} className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                pinned,
                'start-0 z-20 w-32 min-w-32 border-b px-3 py-2 text-start font-semibold md:w-44 md:min-w-44',
              )}
            >
              {t('attendance.worker')}
            </th>
            {PINNED.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={at(11 + i * 3.5)}
                className={cn(
                  pinnedWide,
                  'w-14 min-w-14 border-b px-1 py-2 text-center font-medium md:z-20',
                  i === LAST && 'border-e-2',
                )}
              >
                {t(c.label)}
              </th>
            ))}
            {month.days.map((d) => (
              <th
                key={d.date}
                scope="col"
                data-today={d.is_today || undefined}
                className={cn(
                  'min-w-8 border-b px-0.5 py-1.5 text-center font-medium tabular-nums',
                  d.is_today && 'text-primary',
                )}
              >
                <div className="text-[10px] font-normal text-muted-foreground">
                  {t(`attendance.weekdayShort.${d.weekday}`)}
                </div>
                {d.day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {month.workers.map((w) => (
            <tr key={w.worker_id}>
              <th
                scope="row"
                className={cn(
                  pinned,
                  'start-0 w-32 min-w-32 border-b px-3 py-1.5 text-start md:w-44 md:min-w-44',
                )}
              >
                <div className="max-w-28 truncate text-sm font-medium [unicode-bidi:plaintext] md:max-w-40">
                  {w.name}
                </div>
                {w.job && (
                  <div className="max-w-28 truncate text-[11px] font-normal text-muted-foreground [unicode-bidi:plaintext] md:max-w-40">
                    {w.job}
                  </div>
                )}
              </th>
              {PINNED.map((c, i) => (
                <td
                  key={c.key}
                  style={at(11 + i * 3.5)}
                  className={cn(
                    pinnedWide,
                    'border-b px-1 text-center text-sm font-semibold tabular-nums',
                    w.totals[c.key] > 0 ? c.tone : 'text-muted-foreground/50',
                    i === LAST && 'border-e-2',
                  )}
                >
                  {w.totals[c.key] > 0 ? w.totals[c.key] : '—'}
                </td>
              ))}
              {w.cells.map((c, i) => {
                const d = month.days[i];
                const title =
                  c.kind === 'future'
                    ? undefined
                    : cellTitle(c, formatCairoDay(d.date, lang), t, lang);
                return (
                  <td key={d.date} className="border-b p-0.5 text-center">
                    <span
                      title={title}
                      aria-label={title ? `${w.name} — ${title}` : undefined}
                      className={cn(
                        'grid h-8 min-w-7 place-items-center rounded-md text-xs font-semibold',
                        KIND_TONE[c.kind] ?? '',
                        d.is_today && c.kind !== 'future' && 'ring-2 ring-primary/50',
                      )}
                    >
                      {kindCode(c.kind, t)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className={cn(pinned, 'start-0 px-3 py-2 text-start font-semibold')}>
              {t('attendance.total')}
            </th>
            {PINNED.map((c, i) => (
              <td
                key={c.key}
                style={at(11 + i * 3.5)}
                className={cn(
                  pinnedWide,
                  'px-1 py-2 text-center text-sm font-semibold tabular-nums',
                  i === LAST && 'border-e-2',
                )}
              >
                {month.totals[c.key]}
              </td>
            ))}
            <td colSpan={month.days.length} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** The key under the grid. */
export function AttendanceLegend() {
  const { t } = useTranslation();
  return (
    <ul
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
      aria-label={t('attendance.legend')}
    >
      {SHOWN.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'grid h-6 w-6 place-items-center rounded text-[11px] font-semibold',
              KIND_TONE[k],
            )}
            aria-hidden="true"
          >
            {kindCode(k, t)}
          </span>
          {t(`attendance.status.${k}`)}
        </li>
      ))}
    </ul>
  );
}
