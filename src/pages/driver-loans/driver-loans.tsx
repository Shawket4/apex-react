import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CreditCard,
  FileSpreadsheet,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { PageShell } from '@/shared/ui/page-shell';
import { StatCard } from '@/shared/ui/stat-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { useDriver } from '@/entities/driver/queries';
import { useDriverLoans, useDeleteDriverLoan } from '@/entities/driver-loan/queries';
import type { DriverLoan } from '@/entities/driver-loan/schemas';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { formatCurrency, fmtDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/* ─────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function groupByYearMonth(loans: DriverLoan[]) {
  const sorted = [...loans].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const groups: Record<string, Record<string, DriverLoan[]>> = {};
  for (const l of sorted) {
    const d = new Date(l.date);
    const year = String(d.getFullYear());
    const month = d.toLocaleString('default', { month: 'long' });
    groups[year] ??= {};
    groups[year][month] ??= [];
    groups[year][month].push(l);
  }
  return groups;
}

/**
 * Client-side export of the rows already on screen. The whole payout history
 * of one driver is at most a few hundred rows, so there is nothing to page
 * and no server round-trip to justify.
 */
async function exportPayoutsExcel(opts: {
  fileName: string;
  sheetName: string;
  driverName: string;
  headers: { date: string; kind: string; amount: string; method: string; paid: string };
  paidLabels: { yes: string; no: string };
  kindLabel: (kind: DriverLoan['kind']) => string;
  rows: DriverLoan[];
  rtl: boolean;
}) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ]);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName, {
    views: [{ rightToLeft: opts.rtl }],
  });

  ws.columns = [
    { header: opts.headers.date, key: 'date', width: 14 },
    { header: opts.headers.kind, key: 'kind', width: 16 },
    { header: opts.headers.amount, key: 'amount', width: 14 },
    { header: opts.headers.method, key: 'method', width: 22 },
    { header: opts.headers.paid, key: 'paid', width: 10 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const l of opts.rows) {
    ws.addRow({
      date: l.date,
      kind: opts.kindLabel(l.kind),
      amount: l.amount,
      method: l.method || '',
      paid: l.is_paid ? opts.paidLabels.yes : opts.paidLabels.no,
    });
  }
  ws.getColumn('amount').numFmt = '#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    opts.fileName,
  );
}

function computeStats(loans: DriverLoan[]) {
  const total = loans.length;
  const totalAmount = loans.reduce((s, l) => s + l.amount, 0);
  const paid = loans.filter((l) => l.is_paid);
  return {
    total,
    totalAmount,
    avgAmount: total ? totalAmount / total : 0,
    paidCount: paid.length,
    paidAmount: paid.reduce((s, l) => s + l.amount, 0),
    unpaidAmount: totalAmount - paid.reduce((s, l) => s + l.amount, 0),
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Page                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function DriverLoansPage() {
  const { id } = useParams<{ id: string }>();
  const driverId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);
  const [exporting, setExporting] = React.useState(false);

  const { data: driver } = useDriver(driverId);
  // Advances, loans and salary portions all subtract the same amount, so a
  // single total hides what the money actually was. Splitting them here is the
  // whole point of the kind column.
  const [kindFilter, setKindFilter] = React.useState<'all' | 'advance' | 'loan' | 'salary'>('all');
  const { data: allLoans = [], isLoading } = useDriverLoans(driverId);
  const loans = React.useMemo(
    () => (kindFilter === 'all' ? allLoans : allLoans.filter((l) => l.kind === kindFilter)),
    [allLoans, kindFilter],
  );
  const kindCounts = React.useMemo(() => {
    const c = { all: allLoans.length, advance: 0, loan: 0, salary: 0 };
    for (const l of allLoans) c[l.kind] = (c[l.kind] ?? 0) + 1;
    return c;
  }, [allLoans]);
  const deleteMutation = useDeleteDriverLoan(driverId ?? 0);

  const [deleteTarget, setDeleteTarget] = React.useState<DriverLoan | null>(null);


  const stats = React.useMemo(() => computeStats(loans), [loans]);
  const grouped = React.useMemo(() => groupByYearMonth(loans), [loans]);
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <PageShell
      title={t('driverLoans.title')}
      description={driver?.name ?? t('common.loading')}
      icon={<CreditCard className="h-5 w-5" />}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/drivers/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Button>
          {!canManage && (
            <Badge variant="outline" className="text-xs">
              {t('common.viewOnly')}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={loans.length === 0 || exporting}
            onClick={async () => {
              setExporting(true);
              try {
                // Exports what the active kind chip shows, not always everything —
                // the visible list and the file must agree.
                await exportPayoutsExcel({
                  fileName: `payouts_${(driver?.name ?? 'driver').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
                  sheetName: t('driverLoans.title'),
                  driverName: driver?.name ?? '',
                  headers: {
                    date: t('driverLoans.fields.date'),
                    kind: t('driverLoans.fields.kind'),
                    amount: t('driverLoans.fields.amount'),
                    method: t('driverLoans.fields.method'),
                    paid: t('driverLoans.paid'),
                  },
                  paidLabels: { yes: t('common.yes'), no: t('common.no') },
                  kindLabel: (kind) => t(`driverLoans.kindSingular.${kind}`),
                  rows: loans,
                  rtl: i18n.dir() === 'rtl',
                });
              } finally {
                setExporting(false);
              }
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">{t('driverLoans.export')}</span>
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => navigate(`/drivers/${id}/loans/new`)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('driverLoans.addLoan')}</span>
            </Button>
          )}
        </>
      }
    >
      {/* Split by kind. Rendered even when a kind is empty so the categories
          themselves are discoverable rather than appearing only once used. */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'advance', 'loan', 'salary'] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={kindFilter === k ? 'default' : 'outline'}
            onClick={() => setKindFilter(k)}
          >
            {t(`driverLoans.kinds.${k}`)}
            <span className="ms-1.5 text-xs opacity-70">{kindCounts[k] ?? 0}</span>
          </Button>
        ))}
      </div>

      {/* Stats */}
      {loans.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label={t('driverLoans.stats.total')}
            value={stats.total}
            icon={CreditCard}
          />
          <StatCard
            label={t('driverLoans.stats.totalAmount')}
            value={formatCurrency(stats.totalAmount)}
            icon={DollarSign}
          />
          <StatCard
            label={t('driverLoans.stats.average')}
            value={formatCurrency(stats.avgAmount)}
            icon={DollarSign}
          />
          <StatCard
            label={t('driverLoans.stats.paidCount')}
            value={`${stats.paidCount} / ${stats.total}`}
            icon={CheckCircle}
          />
          <StatCard
            label={t('driverLoans.stats.unpaid')}
            value={formatCurrency(stats.unpaidAmount)}
            icon={DollarSign}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <EmptyState
          lottieSrc="/animations/coins.lottie"
          lottieWidth={120}
          lottieHeight={120}
          title={t('driverLoans.noLoans')}
          description={t('driverLoans.noLoansDescription')}
          action={
            canManage ? (
              <Button onClick={() => navigate(`/drivers/${id}/loans/new`)}>
                <Plus className="h-4 w-4" />
                {t('driverLoans.addLoan')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Year → Month grouped list */
        <div className="space-y-4">
          {years.map((year) => (
            <Card key={year} className="overflow-hidden">
              {/* Year header */}
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {year}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {Object.values(grouped[year]).flat().length} {t('driverLoans.title').toLowerCase()}
                </Badge>
              </div>

              <CardContent className="divide-y p-0">
                {Object.entries(grouped[year]).map(([month, items]) => (
                  <div key={`${year}-${month}`} className="p-3 md:p-4">
                    {/* Month label */}
                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                      <Calendar className="h-3.5 w-3.5" />
                      {month}
                    </div>

                    {/* Loan rows */}
                    <div className="space-y-2">
                      {items.map((loan) => (
                        <div
                          key={loan.ID}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors',
                            loan.is_paid
                              ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'
                              : 'hover:border-border/80 hover:bg-muted/30',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 rounded-full p-1.5',
                                loan.is_paid
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                                  : 'bg-primary/10 text-primary',
                              )}
                            >
                              {loan.is_paid ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <DollarSign className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {formatCurrency(loan.amount)}
                                </span>
                                {loan.is_paid && (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 text-[10px]">
                                    {t('driverLoans.paid')}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {fmtDate(loan.date)}
                                </span>
                                {loan.method && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {loan.method}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Delete — only for unpaid */}
                          {canManage && !loan.is_paid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(loan)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('driverLoans.deleteConfirmTitle')}
        description={t('driverLoans.deleteConfirmDescription', {
          amount: deleteTarget ? formatCurrency(deleteTarget.amount) : '',
        })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.ID, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </PageShell>
  );
}
