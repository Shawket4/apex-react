import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, FileSpreadsheet, UserCheck } from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import { useAttendanceMonth } from '@/entities/maintenance/queries';
import { cairoToday, formatCairoMonth } from '@/shared/lib/cairo';
import { exportToExcel } from '@/shared/lib/excel';
import { SkeletonSwap } from '@/shared/lib/motion';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatCard } from '@/shared/ui/stat-card';
import { AttendanceGrid, AttendanceLegend } from '@/widgets/attendance-month/attendance-grid';
import { attendanceExcel, shiftMonth } from '@/widgets/attendance-month/lib';
import { MaintError, MaintNotConfigured } from '@/widgets/maintenance/maint-states';

const MONTH = /^\d{4}-\d{2}$/;

/**
 * Garage attendance, view only: the garage marks each worker's day in its own
 * app; the office reads the month here and takes it to Excel.
 */
export default function AttendancePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const today = cairoToday(); // month 0-indexed, like Date
  const thisMonth = `${today.y}-${String(today.m + 1).padStart(2, '0')}`;
  const asked = params.get('month') ?? '';
  const month = MONTH.test(asked) && asked <= thisMonth ? asked : thisMonth;
  const [y, m] = month.split('-').map(Number);
  const label = formatCairoMonth(y, m - 1, lang);

  const { data, isError, isFetching, refetch } = useAttendanceMonth(month);
  const go = (next: string) =>
    setParams(
      (current) => {
        const p = new URLSearchParams(current);
        if (next >= thisMonth) p.delete('month');
        else p.set('month', next);
        return p;
      },
      { replace: true },
    );

  const [exporting, setExporting] = React.useState(false);
  const exportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportToExcel(attendanceExcel(data, t('attendance.exportTitle', { month: label }), t));
    } finally {
      setExporting(false);
    }
  };

  const shown = data && data.month === month ? data : undefined;

  return (
    <PageShell
      title={t('attendance.title')}
      description={t('attendance.subtitle')}
      icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
      actions={
        isMaintConfigured && shown && shown.workers.length > 0 ? (
          <Button variant="outline" onClick={() => void exportExcel()} disabled={exporting}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            {t('attendance.export')}
          </Button>
        ) : undefined
      }
    >
      {!isMaintConfigured ? (
        <MaintNotConfigured />
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex items-center gap-2 p-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('attendance.prevMonth')}
                title={t('attendance.prevMonth')}
                onClick={() => go(shiftMonth(month, -1))}
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Button>
              <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold">
                {label}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('attendance.nextMonth')}
                title={t('attendance.nextMonth')}
                onClick={() => go(shiftMonth(month, 1))}
                disabled={month >= thisMonth}
              >
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Button>
              {month < thisMonth && (
                <Button variant="outline" size="sm" onClick={() => go(thisMonth)}>
                  {t('attendance.thisMonth')}
                </Button>
              )}
            </CardContent>
          </Card>

          {isError && !shown ? (
            <MaintError onRetry={() => void refetch()} retrying={isFetching} />
          ) : (
            <SkeletonSwap
              loading={!shown}
              skeleton={
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  </div>
                  <Skeleton className="h-72 rounded-lg" />
                </div>
              }
            >
              {shown &&
                (shown.workers.length === 0 ? (
                  <EmptyState
                    icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
                    title={t('attendance.empty.title')}
                    description={t('attendance.empty.description')}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <StatCard
                        label={t('attendance.totals.present')}
                        value={shown.totals.present}
                        subvalue={
                          shown.totals.unmarked > 0
                            ? t('attendance.unmarkedDays', { n: shown.totals.unmarked })
                            : undefined
                        }
                        tone="success"
                      />
                      <StatCard
                        label={t('attendance.totals.absent')}
                        value={shown.totals.absent}
                        tone="destructive"
                      />
                      <StatCard label={t('attendance.totals.leave')} value={shown.totals.leave} />
                      <StatCard label={t('attendance.totals.sick')} value={shown.totals.sick} />
                    </div>
                    <AttendanceGrid month={shown} />
                    <AttendanceLegend />
                  </div>
                ))}
            </SkeletonSwap>
          )}
        </div>
      )}
    </PageShell>
  );
}
