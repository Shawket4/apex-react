import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  CircleDot,
  ClipboardList,
  Gauge,
  History,
  Info,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { isMaintConfigured } from '@/entities/maintenance/api';
import {
  dueRemaining,
  dueTone,
  groupTirePositions,
  localName,
  wheelLabel,
  type Remaining,
} from '@/entities/maintenance/lib';
import { useVehicleMaintenance } from '@/entities/maintenance/queries';
import { toTireDiagram } from '@/entities/maintenance/tire-diagram';
import type {
  DueRow,
  TirePosition,
  VehicleMaintenance,
  WorkOrderRow,
} from '@/entities/maintenance/schemas';
import { WheelDiagram } from 'apex-tire-diagram';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { CollapsibleSection } from '@/shared/ui/collapsible-section';
import { Skeleton } from '@/shared/ui/skeleton';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { MaintError, MaintNotConfigured } from '@/widgets/maintenance/maint-states';
import { WorkOrderLinkCard } from '@/widgets/maintenance/work-order-bits';

interface SectionProps {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, className, children }: SectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Said wherever "nothing due" could be misread as "all good". */
function NotTracked() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="font-medium">{t('maintenance.class.notTrackedTitle')}</p>
        <p className="text-xs text-muted-foreground">
          {t('maintenance.class.notTrackedDescription')}
        </p>
      </div>
    </div>
  );
}

function WorkOrders({ rows, empty }: { rows: WorkOrderRow[]; empty: string }) {
  if (rows.length === 0) return <Quiet>{empty}</Quiet>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <WorkOrderLinkCard key={row.id} row={row} showPlate={false} />
      ))}
    </div>
  );
}

function RemainingText({ kind, value }: { kind: 'km' | 'days'; value: Remaining }) {
  const { t } = useTranslation();
  const amount = formatNumber(value.amount);
  return (
    <span className={cn('tabular-nums', value.late && 'font-medium text-destructive')}>
      {t(`maintenance.due.${kind}${value.late ? 'Late' : 'Left'}`, { amount })}
    </span>
  );
}

function DueItem({ row }: { row: DueRow }) {
  const { t, i18n } = useTranslation();
  const name =
    localName(row.category_name_ar, row.category_name_en, i18n.language) ??
    row.category_id ??
    t('common.unknown');
  const left = dueRemaining(row);
  const every = [
    row.interval_km !== null
      ? t('maintenance.due.everyKm', { amount: formatNumber(row.interval_km) })
      : null,
    row.interval_days !== null
      ? t('maintenance.due.everyDays', { amount: formatNumber(row.interval_days) })
      : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 text-sm font-medium" dir="auto">
          {name}
        </span>
        <Badge variant={dueTone(row.status)} className="shrink-0">
          {t(`maintenance.due.status.${row.status}`, { defaultValue: row.status })}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {left.km && <RemainingText kind="km" value={left.km} />}
        {left.days && <RemainingText kind="days" value={left.days} />}
        {row.status === 'unknown' && !left.km && (
          <span>{t('maintenance.due.noOdometer')}</span>
        )}
        {row.status === 'never_done' && <span>{t('maintenance.due.neverDoneHint')}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {every.length > 0 && <span>{every.join(' · ')}</span>}
        {row.last_at && (
          <span>
            {t('maintenance.due.lastDone', { date: maintDate(row.last_at, i18n.language) })}
            {row.last_km !== null && (
              <span className="tabular-nums">
                {' · '}
                {formatNumber(row.last_km)} {t('common.unit.km')}
              </span>
            )}
          </span>
        )}
      </div>
    </li>
  );
}

function TireTile({ position }: { position: TirePosition }) {
  const { t, i18n } = useTranslation();
  const empty = position.tire_id === null;
  // Words first ("Tractor axle 2 · right inner"); the garage's code stays as
  // the small print, and stands alone when the server sent nothing to name.
  const label = wheelLabel(position, (key, vars) => t(key, vars ?? {}), i18n.language);
  const code = position.position_code;
  const tire = [position.brand, position.model].filter(Boolean).join(' ');
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-lg border p-2.5',
        empty ? 'border-dashed bg-muted/20' : 'bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-xs font-semibold">
          {label ?? (code ? <bdi dir="ltr">{code}</bdi> : '—')}
        </span>
        {position.is_steering && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {t('maintenance.tires.steering')}
          </span>
        )}
      </div>
      {label && code && (
        <bdi dir="ltr" className="text-[10px] text-muted-foreground">
          {code}
        </bdi>
      )}
      {empty ? (
        <span className="text-xs text-muted-foreground">{t('maintenance.tires.emptyPosition')}</span>
      ) : (
        <>
          <span className="truncate text-sm font-medium" dir="ltr">
            {tire || t('maintenance.tires.unnamed')}
          </span>
          {position.size && (
            <span className="truncate text-xs text-muted-foreground" dir="ltr">
              {position.size}
            </span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            {position.total_km !== null
              ? `${formatNumber(position.total_km)} ${t('common.unit.km')}`
              : '—'}
          </span>
        </>
      )}
    </div>
  );
}

function TireGroup({ title, positions }: { title: string; positions: TirePosition[] }) {
  if (positions.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {positions.map((position) => (
          <TireTile key={position.position_id} position={position} />
        ))}
      </div>
    </div>
  );
}

/**
 * The truck's wheels drawn by the garage's own diagram (2D map, optional 3D),
 * shared with the garage app through `apex-tire-diagram`. Pressing a wheel
 * shows its tire; the office only looks, so nothing here changes anything.
 */
function Tires({ tires }: { tires: TirePosition[] }) {
  const { t, i18n } = useTranslation();
  const diagram = React.useMemo(() => toTireDiagram(tires), [tires]);
  const groups = groupTirePositions(tires);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = diagram.positions.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <WheelDiagram
        axles={diagram.axles}
        positions={diagram.positions}
        lang={i18n.language}
        selectedId={selected?.id ?? null}
        onSelect={(p) => setSelectedId(p.id)}
      />
      <div aria-live="polite" className="space-y-2">
        {selected ? (
          <>
            <h4 className="text-xs font-semibold text-muted-foreground">
              {t('maintenance.tires.selected')}
            </h4>
            <div className="max-w-xs">
              <TireTile position={selected.row} />
            </div>
          </>
        ) : (
          <Quiet>{t('maintenance.tires.pickHint')}</Quiet>
        )}
      </div>
      <CollapsibleSection title={t('maintenance.tires.allPositions')} defaultOpen={false}>
        <div className="space-y-4 p-3">
          <TireGroup title={t('maintenance.tires.tractor')} positions={groups.tractor} />
          <TireGroup title={t('maintenance.tires.trailer')} positions={groups.trailer} />
          <TireGroup title={t('maintenance.tires.other')} positions={groups.other} />
          <TireGroup title={t('maintenance.tires.spares')} positions={groups.spares} />
        </div>
      </CollapsibleSection>
    </div>
  );
}

function Loaded({ data }: { data: VehicleMaintenance }) {
  const { t, i18n } = useTranslation();
  const className = data.class
    ? (localName(data.class.name_ar, data.class.name_en, i18n.language) ?? data.class.id)
    : null;
  const odometer = data.odometer;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section icon={Gauge} title={t('maintenance.odometer.title')}>
        {odometer && odometer.km !== null ? (
          <div className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              {formatNumber(odometer.km)}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {t('common.unit.km')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {[
                odometer.source
                  ? t(`maintenance.odometer.sources.${odometer.source}`, {
                      defaultValue: odometer.source,
                    })
                  : null,
                odometer.observed_at ? maintDate(odometer.observed_at, i18n.language) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ) : (
          <Quiet>{t('maintenance.odometer.none')}</Quiet>
        )}
      </Section>

      <Section icon={Layers} title={t('maintenance.class.title')}>
        {className ? (
          <p className="text-sm font-medium" dir="auto">
            {className}
          </p>
        ) : (
          <NotTracked />
        )}
      </Section>

      <Section
        icon={ClipboardList}
        title={t('maintenance.openWorkOrders')}
        className="lg:col-span-2"
      >
        <WorkOrders rows={data.open_work_orders} empty={t('maintenance.noOpenWorkOrders')} />
      </Section>

      <Section icon={CalendarClock} title={t('maintenance.due.title')} className="lg:col-span-2">
        {!data.class ? (
          <NotTracked />
        ) : data.due.length === 0 ? (
          <Quiet>{t('maintenance.due.noPlans')}</Quiet>
        ) : (
          <ul className="divide-y">
            {data.due.map((row) => (
              <DueItem key={row.plan_id} row={row} />
            ))}
          </ul>
        )}
      </Section>

      <Section icon={CircleDot} title={t('maintenance.tires.title')} className="lg:col-span-2">
        {data.tires.length === 0 ? (
          <Quiet>{t('maintenance.tires.noLayout')}</Quiet>
        ) : (
          <Tires tires={data.tires} />
        )}
      </Section>

      <Section icon={History} title={t('maintenance.recentWorkOrders')} className="lg:col-span-2">
        <WorkOrders rows={data.recent_work_orders} empty={t('maintenance.noRecentWorkOrders')} />
      </Section>
    </div>
  );
}

/**
 * What the garage system knows about one truck. It asks another server, so
 * every failure stays inside this tab: the rest of the car page never waits
 * on it and never breaks with it.
 */
export function CarMaintenanceTab({ carId }: { carId: number }) {
  const { data, isLoading, isError, isFetching, refetch } = useVehicleMaintenance(carId);

  if (!isMaintConfigured) return <MaintNotConfigured />;
  if (isError) return <MaintError onRetry={() => void refetch()} retrying={isFetching} />;
  if (isLoading || !data) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-48 rounded-lg lg:col-span-2" />
      </div>
    );
  }
  return <Loaded data={data} />;
}
