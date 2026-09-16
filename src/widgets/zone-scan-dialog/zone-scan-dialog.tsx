import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BellOff,
  CalendarDays,
  Download,
  FileSearch,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  MAX_SCAN_RANGE_DAYS,
  type ZoneScanResponse,
} from '@/entities/zone/schemas';
import { useScanZonesRange } from '@/entities/zone/queries';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { StatCard } from '@/shared/ui/stat-card';
import { localDateISO, localParts, localToday } from '@/shared/lib/format';
import { exportZoneScanToExcel } from './zone-scan-excel';
import { formatDwell } from './dwell';

/**
 * The picker speaks UTC ISO instants; the proxy wants the local calendar day.
 * Converting through local parts keeps "3 Sep" meaning 3 Sep no matter which
 * side of midnight UTC the instant lands on.
 */
const toLocalDay = (iso: string | null): string | null => {
  if (!iso) return null;
  const { y, m, d } = localParts(iso);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const dayCount = (from: string | null, to: string | null): number | null => {
  if (!from || !to) return null;
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000) + 1;
};

/** Last 7 days, as the picker's own ISO shape. */
function defaultRange(): { from: string; to: string } {
  const today = localToday();
  const start = new Date(today.y, today.m, today.d - 6);
  return {
    from: localDateISO(start.getFullYear(), start.getMonth(), start.getDate()),
    to: localDateISO(today.y, today.m, today.d, true),
  };
}

/**
 * Runs a **manual** dead-zone scan over a chosen range and shows the report.
 * A manual run writes no visit rows and sends nothing to the WhatsApp group,
 * which is what makes it safe to re-run over the same weeks while
 * investigating — the page's other scan button is the alerting round.
 */
export function ZoneScanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const scan = useScanZonesRange();

  const [range, setRange] = React.useState(defaultRange);
  const [result, setResult] = React.useState<ZoneScanResponse | null>(null);
  const [exporting, setExporting] = React.useState(false);

  // Each opening starts fresh, rather than on whatever the last report used.
  React.useEffect(() => {
    if (open) {
      setRange(defaultRange());
      setResult(null);
      scan.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const from = toLocalDay(range.from);
  const to = toLocalDay(range.to);
  const days = dayCount(from, to);
  const tooLong = days !== null && days > MAX_SCAN_RANGE_DAYS;
  const canRun = !!from && !!to && days !== null && days > 0 && !tooLong;

  const onRun = async () => {
    if (!canRun) return;
    const summary = await scan.mutateAsync({ from: from!, to: to! });
    setResult(summary);
  };

  const onExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportZoneScanToExcel(t, result);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('zones.scanRange.title', 'Scan a date range')}</DialogTitle>
          <DialogDescription>
            {t(
              'zones.scanRange.description',
              'Pick the days to check against every active zone. The result comes back here as a report.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={(f, tv) => setRange({ from: f ?? '', to: tv ?? '' })}
          />

          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              {t(
                'zones.scanRange.noAlerts',
                'Nothing is sent to the WhatsApp group — this run only reports.',
              )}
            </p>
          </div>

          {tooLong ? (
            <p className="text-sm text-destructive">
              {t('zones.scanRange.tooLong', {
                max: MAX_SCAN_RANGE_DAYS,
                days,
                defaultValue: 'Pick at most {{max}} days ({{days}} selected).',
              })}
            </p>
          ) : null}

          {result ? <ScanReport result={result} /> : null}
        </div>

        <DialogFooter>
          {result && result.violations.length > 0 ? (
            <Button variant="outline" onClick={() => void onExport()} disabled={exporting}>
              {exporting ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {t('common.export', 'Export')}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
          <Button onClick={() => void onRun()} disabled={!canRun || scan.isPending}>
            {scan.isPending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FileSearch aria-hidden="true" />
            )}
            {result
              ? t('zones.scanRange.runAgain', 'Run again')
              : t('zones.scanRange.run', 'Generate report')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScanReport({ result }: { result: ZoneScanResponse }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" dir="ltr">
        {result.from} → {result.to}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t('zones.scanRange.daysScanned', 'Days scanned')}
          value={result.days_scanned}
          icon={CalendarDays}
        />
        <StatCard
          label={t('zones.scanRange.vehiclesScanned', 'Vehicles scanned')}
          value={result.vehicles_scanned}
          icon={Truck}
        />
        <StatCard
          label={t('zones.scanRange.violationsFound', 'Violations found')}
          value={result.violations_found}
          icon={ShieldAlert}
          tone={result.violations_found > 0 ? 'destructive' : 'default'}
        />
      </div>

      {result.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{result.error}</p>
        </div>
      ) : null}

      {result.violations.length > 0 ? (
        <div className="max-h-[40vh] overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-start">
                <th className="px-3 py-2 text-start font-medium">
                  {t('zones.scanRange.columns.vehicle', 'Vehicle')}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {t('zones.scanRange.columns.zone', 'Zone')}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {t('zones.scanRange.columns.entry', 'In')}
                </th>
                <th className="px-3 py-2 text-start font-medium">
                  {t('zones.scanRange.columns.exit', 'Out')}
                </th>
                <th className="px-3 py-2 text-end font-medium">
                  {t('zones.scanRange.columns.dwell', 'Dwell')}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.violations.map((v, i) => (
                <tr
                  key={`${v.vehicle_id}-${v.zone_id}-${v.entry_local}-${i}`}
                  className="border-t"
                >
                  <td className="px-3 py-2 font-medium">{v.codename}</td>
                  <td className="px-3 py-2">{v.zone_name}</td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">
                    {v.entry_local}
                  </td>
                  <td className="px-3 py-2 tabular-nums" dir="ltr">
                    {v.exit_local}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {formatDwell(t, v.dwell_secs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {t('zones.scanRange.empty', 'No violations in this range.')}
        </div>
      )}
    </div>
  );
}
