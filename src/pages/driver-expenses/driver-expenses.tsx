import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  Tag,
  CreditCard,
  Receipt,
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
import { useDriverExpenses, useDeleteDriverExpense } from '@/entities/driver-expense/queries';
import type { DriverExpense } from '@/entities/driver-expense/schemas';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { format, formatCurrency, fmtDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

/* ─────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function groupByYearMonth(expenses: DriverExpense[]) {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const groups: Record<string, Record<string, DriverExpense[]>> = {};
  for (const e of sorted) {
    const d = new Date(e.date);
    const year = String(d.getFullYear());
    const month = format(d, 'MMMM');
    groups[year] ??= {};
    groups[year][month] ??= [];
    groups[year][month].push(e);
  }
  return groups;
}

function computeStats(expenses: DriverExpense[]) {
  const total = expenses.length;
  const totalAmount = expenses.reduce((s, e) => s + e.cost, 0);
  const paid = expenses.filter((e) => e.is_paid);
  return {
    total,
    totalAmount,
    avgAmount: total ? totalAmount / total : 0,
    paidCount: paid.length,
    paidAmount: paid.reduce((s, e) => s + e.cost, 0),
    unpaidAmount: totalAmount - paid.reduce((s, e) => s + e.cost, 0),
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Page                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function DriverExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const driverId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  const { data: driver } = useDriver(driverId);
  const { data: expenses = [], isLoading } = useDriverExpenses(driverId);
  const deleteMutation = useDeleteDriverExpense(driverId ?? 0);

  const [deleteTarget, setDeleteTarget] = React.useState<DriverExpense | null>(null);

  const stats = React.useMemo(() => computeStats(expenses), [expenses]);
  const grouped = React.useMemo(() => groupByYearMonth(expenses), [expenses]);
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <PageShell
      title={t('driverExpenses.title')}
      description={driver?.name ?? t('common.loading')}
      icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/drivers/${id}`)}
          >
            <ArrowLeft className="rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Button>
          {!canManage && (
            <Badge variant="outline">
              {t('common.viewOnly')}
            </Badge>
          )}
          {canManage && (
            <Button size="sm" onClick={() => navigate(`/drivers/${id}/expenses/new`)}>
              <Plus />
              <span className="hidden sm:inline">{t('driverExpenses.addExpense')}</span>
            </Button>
          )}
        </>
      }
    >
      {/* Stats */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label={t('driverExpenses.stats.total')}
            value={stats.total}
            icon={Receipt}
          />
          <StatCard
            label={t('driverExpenses.stats.totalAmount')}
            value={formatCurrency(stats.totalAmount)}
            valueClassName="font-mono text-money"
            icon={DollarSign}
          />
          <StatCard
            label={t('driverExpenses.stats.average')}
            value={formatCurrency(stats.avgAmount)}
            valueClassName="font-mono text-money"
            icon={DollarSign}
          />
          <StatCard
            label={t('driverExpenses.stats.paidCount')}
            value={`${stats.paidCount} / ${stats.total}`}
            icon={CheckCircle}
          />
          <StatCard
            label={t('driverExpenses.stats.unpaid')}
            value={formatCurrency(stats.unpaidAmount)}
            valueClassName="font-mono text-money"
            icon={DollarSign}
          />
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[70px] rounded-lg" />
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          lottieSrc="/animations/coins.lottie"
          lottieWidth={120}
          lottieHeight={120}
          title={t('driverExpenses.noExpenses')}
          description={t('driverExpenses.noExpensesDescription')}
          action={
            canManage ? (
              <Button onClick={() => navigate(`/drivers/${id}/expenses/new`)}>
                <Plus />
                {t('driverExpenses.addExpense')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Year → Month grouped list */
        <div className="space-y-3">
          {years.map((year) => (
            <Card key={year} className="overflow-hidden">
              {/* Year header */}
              <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {year}
                </div>
                <Badge variant="secondary">
                  {t('driverExpenses.countLabel', {
                    count: Object.values(grouped[year]).flat().length,
                    defaultValue: '{{count}} expenses',
                  })}
                </Badge>
              </div>

              <CardContent className="divide-y p-0">
                {Object.entries(grouped[year]).map(([month, items]) => (
                  <div key={`${year}-${month}`} className="p-3 md:p-4">
                    {/* Month label */}
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {month}
                    </div>

                    {/* Expense rows */}
                    <div className="space-y-2">
                      {items.map((expense) => (
                        <div
                          key={expense.ID}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
                            expense.is_paid
                              ? 'border-success/40 bg-success/10'
                              : '',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 rounded-full p-1.5',
                                expense.is_paid
                                  ? 'bg-success/10 text-success'
                                  : 'bg-destructive/10 text-destructive',
                              )}
                            >
                              {expense.is_paid ? (
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Receipt className="h-4 w-4" aria-hidden="true" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-semibold tabular-nums text-money">
                                  {formatCurrency(expense.cost)}
                                </span>
                                {expense.category && (
                                  <Badge variant="secondary">
                                    <Tag className="me-1 h-3 w-3" aria-hidden="true" />
                                    {t(`driverExpenses.categories.${expense.category}`, { defaultValue: expense.category })}
                                  </Badge>
                                )}
                                {expense.is_paid && (
                                  <Badge variant="success">
                                    {t('driverExpenses.paid')}
                                  </Badge>
                                )}
                              </div>
                              {expense.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {expense.description}
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" aria-hidden="true" />
                                  {fmtDate(expense.date)}
                                </span>
                                {expense.payment_method && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" aria-hidden="true" />
                                    {t(`driverExpenses.paymentMethods.${expense.payment_method}`, { defaultValue: expense.payment_method })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Delete — only for unpaid */}
                          {canManage && !expense.is_paid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(expense)}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 />
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
        title={t('driverExpenses.deleteConfirmTitle')}
        description={t('driverExpenses.deleteConfirmDescription', {
          amount: deleteTarget ? formatCurrency(deleteTarget.cost) : '',
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
