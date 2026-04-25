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
  firstDayOfMonth,
  lastDayOfMonth,
  toDateOnly,
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
  /** Total revenue from all companies (to ensure projection matches KPIs) */
  totalRevenue?: number;
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
  totalRevenue,
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
    if (!minDate || !maxDate) return { chartData: [], hasOther: false };

    const start = new Date(minDate + 'T00:00:00');
    const end = new Date(maxDate + 'T23:59:59');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return buildRowsWithoutGapFill(daily, series, OTHER_KEY, metric);
    }

    const labelToKey = new Map(series.map((s) => [s.label, s.key]));
    const rows: Array<Record<string, number | string>> = [];
    let sawOther = false;
    const cur = new Date(start);

    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;

      const d = dailyByDate.get(iso);
      const row: Record<string, number | string> = { date: iso };
      
      // Initialize all top-N series AND the "Other" series to 0.
      // This ensures every row has all keys for consistent rendering.
      for (const s of series) row[s.key] = 0;
      row[OTHER_KEY] = 0;

      let otherValue = 0;
      for (const cd of d?.company_details ?? []) {
        const v =
          metric === 'revenue'
            ? cd.total_revenue ?? 0
            : metric === 'volume'
              ? cd.total_volume ?? 0
              : cd.total_trips ?? 0;
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

    const revenueToUse = totalRevenue || daily.reduce(
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

    const monthStart = firstDayOfMonth(end);
    const monthEnd = lastDayOfMonth(end);
    const daysInMonth = daysBetween(monthStart, monthEnd);

    return {
      total: dailyAvg * daysInMonth,
      dailyAvg,
      rangeDays,
    };
  }, [daily, hasFinancialAccess, metric, startDate, endDate, totalRevenue]);

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
                {/* Render each series as an overlapping Area with gradient fill.
                NO stackId — areas overlap and blend visually, matching the
                revenue chart design. */}
                {visibleSeries.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={`url(#grad-${s.key})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {projection && (
            <div className="border-t bg-muted/20 px-4 py-3 md:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t('trips.statistics.timeline.projectedRevenue')}
                  </p>
                  <p className="text-xl font-bold tracking-tight text-success">
                    {formatCurrency(projection.total)}
                  </p>
                </div>
                <div className="text-[10px] text-muted-foreground sm:text-right">
                  <p>
                    {t('trips.statistics.timeline.projectedRevenueNote', {
                      avg: formatCompactCurrency(projection.dailyAvg),
                      days: projection.rangeDays,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}

/**
 * Fallback row builder for when start/end can't be parsed — emit only the
 * dates we have, no gap fill. Same safe-key transform as the main path.
 */
function buildRowsWithoutGapFill(
  daily: DailyStat[],
  series: Array<{ key: string; label: string }>,
  otherKey: string,
  metric: Metric,
): { chartData: Array<Record<string, number | string>>; hasOther: boolean } {
  const labelToKey = new Map(series.map((s) => [s.label, s.key]));
  let sawOther = false;

  const chartData = daily.map((d) => {
    const row: Record<string, number | string> = { date: d.date };
    
    // Initialize all series keys to 0
    for (const s of series) row[s.key] = 0;
    row[otherKey] = 0;

    let otherValue = 0;
    for (const cd of d.company_details ?? []) {
      const v =
        metric === 'revenue'
          ? cd.total_revenue ?? 0
          : metric === 'volume'
            ? cd.total_volume ?? 0
            : cd.total_trips ?? 0;
      const safeKey = labelToKey.get(cd.company);
      if (safeKey) {
        row[safeKey] = v;
      } else {
        otherValue += v;
      }
    }
    if (otherValue > 0) {
      row[otherKey] = otherValue;
      sawOther = true;
    }
    return row;
  });

  return { chartData, hasOther: sawOther };
}