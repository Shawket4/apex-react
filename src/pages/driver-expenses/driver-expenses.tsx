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
import { formatCurrency, fmtDate } from '@/shared/lib/format';
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
    const month = d.toLocaleString('default', { month: 'long' });
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
      icon={<Receipt className="h-5 w-5" />}
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
          {canManage && (
            <Button size="sm" onClick={() => navigate(`/drivers/${id}/expenses/new`)}>
              <Plus className="h-4 w-4" />
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
            icon={DollarSign}
          />
          <StatCard
            label={t('driverExpenses.stats.average')}
            value={formatCurrency(stats.avgAmount)}
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
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" />}
          title={t('driverExpenses.noExpenses')}
          description={t('driverExpenses.noExpensesDescription')}
          action={
            canManage ? (
              <Button onClick={() => navigate(`/drivers/${id}/expenses/new`)}>
                <Plus className="h-4 w-4" />
                {t('driverExpenses.addExpense')}
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
                  {Object.values(grouped[year]).flat().length} {t('driverExpenses.title').toLowerCase()}
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

                    {/* Expense rows */}
                    <div className="space-y-2">
                      {items.map((expense) => (
                        <div
                          key={expense.ID}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors',
                            expense.is_paid
                              ? 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-950/20'
                              : 'hover:border-border/80 hover:bg-muted/30',
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 rounded-full p-1.5',
                                expense.is_paid
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                                  : 'bg-destructive/10 text-destructive',
                              )}
                            >
                              {expense.is_paid ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Receipt className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {formatCurrency(expense.cost)}
                                </span>
                                {expense.category && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Tag className="mr-1 h-3 w-3" />
                                    {expense.category}
                                  </Badge>
                                )}
                                {expense.is_paid && (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400 text-[10px]">
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
                                  <Calendar className="h-3 w-3" />
                                  {fmtDate(expense.date)}
                                </span>
                                {expense.payment_method && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {expense.payment_method}
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
