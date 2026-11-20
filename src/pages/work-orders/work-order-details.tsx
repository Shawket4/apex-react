import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleDot,
  ClipboardList,
  Droplets,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import { localName } from '@/entities/maintenance/lib';
import { useWorkOrder } from '@/entities/maintenance/queries';
import type {
  WorkOrderDetail,
  WorkOrderOilChange,
  WorkOrderTask,
  WorkOrderTireWork,
} from '@/entities/maintenance/schemas';
import { NotFoundError } from '@/shared/api/errors';
import { formatNumber } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageShell } from '@/shared/ui/page-shell';
import { Skeleton } from '@/shared/ui/skeleton';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { MaintError, MaintNotConfigured } from '@/widgets/maintenance/maint-states';
import {
  WorkOrderProgress,
  WorkOrderStatusBadge,
  } from '@/widgets/maintenance/work-order-bits';

function BackToList() {
  const { t } = useTranslation();
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/work-orders" aria-label={t('common.back')}>
        <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
        <span className="hidden sm:inline">{t('common.back')}</span>
      </Link>
    </Button>
  );
}

interface SectionProps {
  icon: LucideIcon;
  title: string;
  count?: number;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, count, children }: SectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
          {typeof count === 'number' && <span className="tabular-nums">· {count}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

const DASH = <span className="opacity-40">—</span>;

function km(value: number | null, unit: string): React.ReactNode {
  return value === null ? DASH : <span className="tabular-nums">{`${formatNumber(value)} ${unit}`}</span>;
}

function Tasks({ tasks }: { tasks: WorkOrderTask[] }) {
  const { t, i18n } = useTranslation();
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('workOrders.detail.noTasks')}</p>;
  }
  return (
    <ul className="divide-y">
      {tasks.map((task) => {
        const type = localName(task.category_ar, task.category_en, i18n.language);
        return (
          <li key={task.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            {task.is_done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium" dir="auto">
                {task.description?.trim() || type || t('workOrders.detail.unnamedTask')}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {task.is_done
                    ? task.done_at
                      ? t('workOrders.detail.doneOn', { date: maintDate(task.done_at, i18n.language) })
                      : t('workOrders.detail.done')
                    : t('workOrders.detail.notDone')}
                </span>
                {type ? (
                  <span>{t('workOrders.detail.countsToward', { type })}</span>
                ) : (
                  <span>{t('workOrders.detail.countsTowardNothing')}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OilChanges({ changes }: { changes: WorkOrderOilChange[] }) {
  const { t, i18n } = useTranslation();
  const unit = t('common.unit.km');
  return (
    <ul className="divide-y">
      {changes.map((change) => (
        <li key={change.id} className="space-y-1.5 py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium" dir="auto">
              {change.oil_type ?? t('workOrders.detail.oilTypeUnknown')}
            </span>
            {change.liters !== null && (
              <span className="text-sm tabular-nums text-muted-foreground">
                {t('workOrders.oilLiters', { liters: formatNumber(change.liters, 1) })}
              </span>
            )}
            {change.flagged && (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {t('workOrders.detail.flagged')}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{maintDate(change.performed_at, i18n.language)}</span>
            {change.odometer !== null && (
              <span className="tabular-nums">
                {formatNumber(change.odometer)} {unit}
              </span>
            )}
          </div>
          {change.flagged && (
            <p className="text-xs text-warning">{t('workOrders.detail.flaggedHint')}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function TireWork({ work }: { work: WorkOrderTireWork[] }) {
  const { t, i18n } = useTranslation();
  const unit = t('common.unit.km');
  return (
    <ul className="divide-y">
      {work.map((item) => {
        const tire = [item.brand, item.model, item.size].filter(Boolean).join(' · ');
        return (
          <li key={item.assignment_id} className="space-y-2 py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium" dir="ltr">
                {tire || t('maintenance.tires.unnamed')}
              </span>
              {item.dot_code && (
                <span className="text-xs text-muted-foreground" dir="ltr">
                  DOT {item.dot_code}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Fact label={t('maintenance.tires.position')}>
                {item.position_code ? <span dir="ltr">{item.position_code}</span> : DASH}
              </Fact>
              {item.fitted_here && (
                <>
                  <Fact label={t('workOrders.detail.fitted')}>
                    <span className="flex flex-col">
                      <span>{maintDate(item.mounted_at, i18n.language)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {km(item.mounted_odometer, unit)}
                      </span>
                    </span>
                  </Fact>
                  <Fact label={t('workOrders.detail.fitReason')}>
                    {item.mount_reason
                      ? t(`maintenance.mountReason.${item.mount_reason}`, {
                          defaultValue: item.mount_reason,
                        })
                      : DASH}
                  </Fact>
                </>
              )}
              {item.removed_here && (
                <>
                  <Fact label={t('workOrders.detail.removed')}>
                    <span className="flex flex-col">
                      <span>{maintDate(item.dismounted_at, i18n.language)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {km(item.dismounted_odometer, unit)}
                      </span>
                    </span>
                  </Fact>
                  <Fact label={t('workOrders.detail.removeReason')}>
                    {item.dismount_reason
                      ? t(`maintenance.dismountReason.${item.dismount_reason}`, {
                          defaultValue: item.dismount_reason,
                        })
                      : DASH}
                  </Fact>
                </>
              )}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function Body({ detail }: { detail: WorkOrderDetail }) {
  const { t, i18n } = useTranslation();
  const order = detail.work_order;
  const unit = t('common.unit.km');
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="space-y-4 p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            <Fact label={t('workOrders.fields.plate')}>
              {order.vehicle_id !== null ? (
                <Link
                  to={`/cars/${order.vehicle_id}?tab=maintenance`}
                  className="text-primary underline-offset-4 hover:underline"
                  dir="auto"
                >
                  {order.plate ?? t('workOrders.detail.openTruck')}
                </Link>
              ) : (
                <span dir="auto">{order.plate ?? DASH}</span>
              )}
            </Fact>
            <Fact label={t('workOrders.fields.status')}>
              <WorkOrderStatusBadge status={order.status} />
            </Fact>
            <Fact label={t('workOrders.fields.opened')}>
              {maintDate(order.opened_at, i18n.language)}
            </Fact>
            <Fact label={t('workOrders.fields.closed')}>
              {order.closed_at ? maintDate(order.closed_at, i18n.language) : DASH}
            </Fact>
            <Fact label={t('workOrders.fields.odometer')}>{km(order.odometer, unit)}</Fact>
            <Fact label={t('workOrders.fields.progress')}>
              <WorkOrderProgress row={order} />
            </Fact>
          </dl>
          {order.notes?.trim() && (
            <div>
              <div className="text-xs text-muted-foreground">{t('workOrders.fields.notes')}</div>
              <p className="whitespace-pre-wrap text-sm" dir="auto">
                {order.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Section icon={ListChecks} title={t('workOrders.detail.tasks')} count={detail.tasks.length}>
        <Tasks tasks={detail.tasks} />
      </Section>

      {detail.oil_changes.length > 0 && (
        <Section
          icon={Droplets}
          title={t('workOrders.detail.oilChanges')}
          count={detail.oil_changes.length}
        >
          <OilChanges changes={detail.oil_changes} />
        </Section>
      )}

      {detail.tire_work.length > 0 && (
        <Section
          icon={CircleDot}
          title={t('workOrders.detail.tireWork')}
          count={detail.tire_work.length}
        >
          <TireWork work={detail.tire_work} />
        </Section>
      )}
    </div>
  );
}

/** One work order, read-only: what was asked for, what was done, oil and tires. */
export default function WorkOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, isLoading, isError, error, isFetching, refetch } = useWorkOrder(id);
  const icon = <ClipboardList className="h-5 w-5" aria-hidden="true" />;
  const order = data?.work_order;

  const title = order ? (
    <span dir="auto">{order.title?.trim() || order.plate || t('workOrders.detail.title')}</span>
  ) : isLoading && isMaintConfigured ? (
    <Skeleton className="h-8 w-48 rounded-sm" />
  ) : (
    t('workOrders.detail.title')
  );

  return (
    <PageShell
      title={title}
      description={t('workOrders.detail.subtitle')}
      icon={icon}
      actions={<BackToList />}
    >
      {!isMaintConfigured ? (
        <MaintNotConfigured />
      ) : isError && error instanceof NotFoundError ? (
        <EmptyState
          icon={icon}
          title={t('workOrders.detail.notFound')}
          description={t('workOrders.detail.notFoundDescription')}
          action={<BackToList />}
        />
      ) : isError ? (
        <MaintError onRetry={() => void refetch()} retrying={isFetching} />
      ) : isLoading || !data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : (
        <Body detail={data} />
      )}
    </PageShell>
  );
}
