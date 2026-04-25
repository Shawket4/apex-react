import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as ChartIcon } from 'lucide-react';
import { ChartCard } from '@/shared/ui/chart-card';
import { EmptyState } from '@/shared/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  format,
  formatNumber,
  formatCurrency,
  daysBetween,
  toDateOnly,
  parseISO,
} from '@/shared/lib/format';
import { formatCompactNumber, formatCompactCurrency } from '@/shared/lib/format-number';
import {
  CHART_SERIES_COLORS,
  CHART_OTHER_COLOR,
} from '@/shared/lib/chart-theme';
import type { DailyStat } from '@/entities/trip-statistics/schemas';

type Metric = 'revenue' | 'volume' | 'trips';

interface TripsStatisticsTimelineProps {
  daily: DailyStat[];
  hasFinancialAccess: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Daily timeline area chart, stacked by top-N companies.
 *
 * **Visual style:** Matches the revenue chart with overlapping gradient-filled
 * areas. Each series uses semi-transparent gradients (55% → 15% opacity) that
 * blend visually where they overlap.
 *
 * **Safe internal keys:** Recharts has issues with `<Area dataKey="...">`
 * when the dataKey contains spaces or other characters that interact badly
 * with its internal series identification (especially combined with
 * `stackId`). Areas may be silently skipped from the render output. We
 * sidestep this by using simple `series_0` / `series_1` / ... keys
 * internally, while keeping the original company name only for tooltip /
 * legend display.
 *
 * **Gap fill** synthesises zero rows for missing days so the chart draws a
 * continuous baseline. Date arithmetic stays in local time
 * (`getFullYear/Month/Date`) to avoid UTC drift in non-UTC timezones.
 */
export function TripsStatisticsTimeline({
  daily,
  hasFinancialAccess,
  startDate,
  endDate,
}: TripsStatisticsTimelineProps) {
  const { t } = useTranslation();
  const [metric, setMetric] = React.useState<Metric>(
    hasFinancialAccess ? 'revenue' : 'volume',
  );

  /* -------------------------------------------------------------------------- */
  /* Top 5 companies for the active metric, mapped to safe series keys          */
  /* -------------------------------------------------------------------------- */

  const series = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of daily) {
      for (const cd of d.company_details ?? []) {
        const v =
          metric === 'revenue'
            ? cd.total_revenue ?? 0
            : metric === 'volume'
              ? cd.total_volume ?? 0
              : cd.total_trips ?? 0;
        totals.set(cd.company, (totals.get(cd.company) ?? 0) + v);
      }
    }
    const ranked = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Map each company → an internal-only key like "s0", "s1", ...
    return ranked.map(([company], i) => ({
      key: `s${i}`,
      label: company,
      color: CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length],
    }));
  }, [daily, metric]);

  // The "Other" bucket also gets its own safe key
  const OTHER_KEY = 's_other';

  /* -------------------------------------------------------------------------- */
  /* Build chart rows (gap-filled, local-time)                                  */
  /* -------------------------------------------------------------------------- */

  const { chartData, hasOther } = React.useMemo(() => {
    if (daily.length === 0) return { chartData: [], hasOther: false };

    const dailyByDate = new Map(daily.map((d) => [toDateOnly(d.date), d]));
    const sortedDates = [...dailyByDate.keys()].sort();
    const minDate = startDate ? toDateOnly(startDate) : sortedDates[0];
    const maxDate = endDate ? toDateOnly(endDate) : sortedDates[sortedDates.length - 1];
    
    const startDateObj = minDate ? parseISO(minDate) : null;
    const endDateObj = maxDate ? parseISO(maxDate) : null;
    if (!startDateObj || !endDateObj) return { chartData: [], hasOther: false };

    const labelToKey = new Map(series.map((s) => [s.label, s.key]));
    const rows: Array<Record<string, number | string>> = [];
    let sawOther = false;

    // Use a while loop with a clone to avoid mutating the original startDateObj
    const cur = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const end = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate(), 23, 59, 59);

    while (cur <= end) {
      const iso = toDateOnly(cur);
      const d = dailyByDate.get(iso);

      const row: Record<string, number | string> = { date: iso };
      for (const s of series) row[s.key] = 0;
      row[OTHER_KEY] = 0;

      if (d) {
        let otherValue = 0;
        for (const cd of d.company_details ?? []) {
          let v =
            metric === 'revenue'
              ? cd.total_revenue ?? cd.total_with_vat ?? 0
              : metric === 'volume'
                ? cd.total_volume ?? 0
                : cd.total_trips ?? 0;
          
          if (!Number.isFinite(v)) v = 0;

          const safeKey = labelToKey.get(cd.company);
          if (safeKey) {
            row[safeKey] = v;
          } else {
            otherValue += v;
          }
        }
        if (otherValue > 0) {
          row[OTHER_KEY] = otherValue;
          sawOther = true;
        }
      }
      rows.push(row);
      cur.setDate(cur.getDate() + 1);
    }

    return { chartData: rows, hasOther: sawOther };
  }, [daily, series, metric, startDate, endDate]);

  // Visible series in render order — top companies first, then "Other" if any
  const visibleSeries = React.useMemo(() => {
    const arr: Array<{ key: string; label: string; color: string }> = [
      ...series,
    ];
    if (hasOther) {
      arr.push({ key: OTHER_KEY, label: 'Other', color: CHART_OTHER_COLOR });
    }
    return arr;
  }, [series, hasOther]);

  const formatValue = (v: number) => {
    if (metric === 'revenue') return formatCurrency(v);
    if (metric === 'volume') return `${formatNumber(v, 2)} L`;
    return formatNumber(v, 0);
  };

  // For the tooltip — map series keys back to readable labels
  const keyToLabel = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of visibleSeries) map.set(s.key, s.label);
    return map;
  }, [visibleSeries]);

  const projection = React.useMemo(() => {
    if (!hasFinancialAccess || daily.length === 0 || metric !== 'revenue') {
      return null;
    }

    const revenueToUse = daily.reduce(
      (sum, d) => sum + (d.total_revenue ?? 0),
      0,
    );

    // Use filter range if available, otherwise data range
    const startStr = toDateOnly(startDate || (daily.length > 0 ? daily[0].date : null));
    const endStr = toDateOnly(endDate || (daily.length > 0 ? daily[daily.length - 1].date : null));
    
    if (!startStr || !endStr) return null;

    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    const rangeDays = daysBetween(start, end);
    const dailyAvg = revenueToUse / rangeDays;

    const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

    return {
      total: dailyAvg * daysInMonth,
      dailyAvg,
      rangeDays,
    };
  }, [daily, hasFinancialAccess, metric, startDate, endDate]);

  const dailyStats = React.useMemo(() => {
    if (chartData.length === 0) return null;
    const totalsPerDay = chartData.map((row) =>
      visibleSeries.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0),
    );
    const nonZero = totalsPerDay.filter((v) => v > 0);
    if (nonZero.length === 0) return { min: 0, max: 0, avg: 0 };

    return {
      min: Math.min(...nonZero),
      max: Math.max(...totalsPerDay),
      avg: totalsPerDay.reduce((a, b) => a + b, 0) / totalsPerDay.length,
    };
  }, [chartData, visibleSeries]);

  const metricOptions: Metric[] = hasFinancialAccess
    ? ['revenue', 'volume', 'trips']
    : ['volume', 'trips'];

  return (
    <ChartCard
      title={t(`trips.statistics.timeline.title.${metric}`)}
      description={t('trips.statistics.timeline.description')}
      height="auto"
      padded={false}
      bodyClassName="flex flex-col"
      actions={
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metricOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {t(`trips.statistics.timeline.metric.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {chartData.length === 0 ? (
        <div className="px-3 py-10">
          <EmptyState
            icon={<ChartIcon className="h-5 w-5" />}
            title={t('trips.statistics.timeline.empty')}
          />
        </div>
      ) : (
        <>
          <div className="px-3 pt-2 pb-1" style={{ height: '360px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  {/* Gradient definitions matching the revenue chart style:
                  55% opacity at top → 15% at bottom for visible blending */}
                  {visibleSeries.map((s) => (
                    <linearGradient
                      key={s.key}
                      id={`grad-${s.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.15} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => format(d, 'd MMM')}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCompactNumber(v, 0)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  content={({ active: _active, payload, label }) => {
                    if (!_active || !payload || payload.length === 0) return null;

                    const total = payload.reduce(
                      (sum: number, entry: any) => sum + (Number(entry.value) || 0),
                      0,
                    );

                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="mb-1 text-xs font-medium">
                          {format(String(label), 'PPP')}
                        </div>
                        <div className="space-y-1">
                          {/* Total line */}
                          <div className="mb-1 flex items-center justify-between gap-4 border-b pb-1 text-xs font-bold">
                            <span>{t('trips.statistics.carTable.total')}</span>
                            <span className="tabular">{formatValue(total)}</span>
                          </div>

                          {payload.map((entry: any) => {
                            const key = String(entry.dataKey ?? '');
                            const displayLabel = keyToLabel.get(key) ?? key;
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between gap-4 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span>{displayLabel}</span>
                                </div>
                                <span className="font-semibold tabular">
                                  {formatValue(entry.value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs">
                      {keyToLabel.get(value) ?? value}
                    </span>
                  )}
                />
                {/* Render each series as a stacked Area with gradient fill. */}
                {visibleSeries.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stackId="a"
                    stroke={s.color}
                    strokeWidth={2}
                    fill={`url(#grad-${s.key})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {(projection || dailyStats) && (
            <div className="border-t bg-muted/20 px-4 py-3 md:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                {projection && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t('trips.statistics.timeline.projectedRevenue')}
                    </p>
                    <p className="text-xl font-bold tracking-tight text-success">
                      {formatCurrency(projection.total)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t('trips.statistics.timeline.projectedRevenueNote', {
                        avg: formatCompactCurrency(projection.dailyAvg),
                        days: projection.rangeDays,
                      })}
                    </p>
                  </div>
                )}

                {dailyStats && (
                  <div className="grid grid-cols-3 gap-4 border-t pt-3 sm:border-t-0 sm:pt-0">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t('trips.statistics.timeline.min')}
                      </p>
                      <p className="text-sm font-bold tabular-nums">
                        {formatValue(dailyStats.min)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t('trips.statistics.timeline.max')}
                      </p>
                      <p className="text-sm font-bold tabular-nums">
                        {formatValue(dailyStats.max)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t('trips.statistics.timeline.avg')}
                      </p>
                      <p className="text-sm font-bold tabular-nums">
                        {formatValue(dailyStats.avg)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}
