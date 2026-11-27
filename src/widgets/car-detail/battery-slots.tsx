import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import { batterySlots, batterySpec, digits, warrantyOver } from '@/entities/maintenance/lib';
import type {
  Battery,
  FittedBattery,
  RemovedBattery,
  VehicleBatteries,
} from '@/entities/maintenance/schemas';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleSection } from '@/shared/ui/collapsible-section';
import { maintDate } from '@/widgets/maintenance/maint-date';
import { Block, Facts, Km, WorkOrderLink } from './detail-bits';
import { useGarageWord } from './use-garage-word';

function batteryName(battery: Battery | null): string {
  return battery ? [battery.brand, battery.model].filter(Boolean).join(' ') : '';
}

function useSlotLabel() {
  const { t, i18n } = useTranslation();
  return (slot: number | null) =>
    slot !== null
      ? t('maintenance.batteries.slot', { n: digits(slot, i18n.language) })
      : t('maintenance.batteries.unplaced');
}

/** "18 months · until 3 Mar 2027", "No warranty", or nothing when unknown. */
function Warranty({ battery }: { battery: Battery }) {
  const { t, i18n } = useTranslation();
  const months = battery.warranty_months;
  if (months === null && !battery.warranty_until) return null;
  if (months === 0) return <>{t('maintenance.batteries.noWarranty')}</>;
  const over = warrantyOver(battery.warranty_until);
  return (
    <span className={cn(over && 'text-destructive')}>
      {[
        months !== null
          ? t('maintenance.batteries.warrantyMonths', {
              count: months,
              n: digits(months, i18n.language),
            })
          : null,
        battery.warranty_until
          ? t('maintenance.batteries.untilDate', {
              date: maintDate(battery.warranty_until, i18n.language),
            })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    </span>
  );
}

/** One slot: the battery in it with everything the garage recorded, or empty. */
function SlotTile({ slot, install }: { slot: number | null; install: FittedBattery | null }) {
  const { t, i18n } = useTranslation();
  const word = useGarageWord();
  const slotLabel = useSlotLabel();
  const battery = install?.battery ?? null;

  if (!install) {
    return (
      <div className="flex min-h-24 flex-col gap-1 rounded-lg border border-dashed bg-muted/20 p-3.5">
        <span className="text-sm font-semibold">{slotLabel(slot)}</span>
        <span className="text-sm text-muted-foreground">
          {t('maintenance.batteries.emptySlot')}
        </span>
      </div>
    );
  }

  const name = batteryName(battery);
  const spec = battery ? batterySpec(battery, { cca: true }) : null;
  const over = warrantyOver(battery?.warranty_until);

  return (
    <div className="min-w-0 space-y-3 rounded-lg border bg-card p-3.5">
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{slotLabel(slot)}</span>
        {over && (
          <Badge variant="destructive" className="gap-1 py-0.5">
            <TriangleAlert className="h-3 w-3" aria-hidden="true" />
            {t('maintenance.batteries.warrantyOver')}
          </Badge>
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-base font-semibold">
          {name ? <bdi dir="ltr">{name}</bdi> : t('maintenance.batteries.unnamed')}
        </div>
        {spec && (
          <div className="truncate text-sm text-muted-foreground">
            <bdi dir="ltr">{spec}</bdi>
          </div>
        )}
      </div>

      {battery && (
        <Facts
          rows={[
            [t('maintenance.batteries.serial'), battery.serial && <bdi dir="ltr">{battery.serial}</bdi>],
            [
              t('maintenance.batteries.dateCode'),
              battery.date_code && <bdi dir="ltr">{battery.date_code}</bdi>,
            ],
            [t('maintenance.batteries.warranty'), <Warranty key="w" battery={battery} />],
            [
              t('maintenance.batteries.origin'),
              battery.origin && word('batteryOrigin', battery.origin),
            ],
            [
              t('maintenance.batteries.registered'),
              battery.registered_at && maintDate(battery.registered_at, i18n.language),
            ],
            [
              t('maintenance.batteries.notes'),
              battery.notes && (
                <span dir="auto" className="whitespace-pre-wrap">
                  {battery.notes}
                </span>
              ),
            ],
          ]}
        />
      )}

      <Block title={t('maintenance.batteries.thisFitting')}>
        <Facts
          rows={[
            [
              t('maintenance.batteries.fitted'),
              install.installed_at && maintDate(install.installed_at, i18n.language),
            ],
            [
              t('maintenance.batteries.fittedAtKm'),
              install.installed_odometer !== null ? (
                <Km key="at" value={install.installed_odometer} />
              ) : null,
            ],
            [
              t('maintenance.batteries.kmThisInstall'),
              install.km_this_install !== null ? (
                <Km key="since" value={install.km_this_install} />
              ) : null,
            ],
            [
              t('maintenance.batteries.workOrder'),
              install.work_order_id && (
                <WorkOrderLink
                  id={install.work_order_id}
                  label={t('maintenance.batteries.openWorkOrder')}
                />
              ),
            ],
            [
              t('maintenance.batteries.fitNotes'),
              install.notes && (
                <span dir="auto" className="whitespace-pre-wrap">
                  {install.notes}
                </span>
              ),
            ],
          ]}
        />
      </Block>
    </div>
  );
}

function RemovedItem({ row }: { row: RemovedBattery }) {
  const { t, i18n } = useTranslation();
  const word = useGarageWord();
  const slotLabel = useSlotLabel();
  const battery = row.battery;
  const name = batteryName(battery);
  const spec = battery ? batterySpec(battery) : null;
  const orders = [
    row.work_order_id && { id: row.work_order_id, label: t('maintenance.batteries.fittingOrder') },
    row.removal_work_order_id &&
      row.removal_work_order_id !== row.work_order_id && {
        id: row.removal_work_order_id,
        label: t('maintenance.batteries.removalOrder'),
      },
  ].filter((order): order is { id: string; label: string } => !!order);

  return (
    <li className="space-y-0.5 rounded-md bg-muted/40 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-medium">
        <span className="min-w-0">
          {name ? <bdi dir="ltr">{name}</bdi> : t('maintenance.batteries.unnamed')}
          {spec && (
            <>
              {' · '}
              <bdi dir="ltr">{spec}</bdi>
            </>
          )}
        </span>
        {row.km_run !== null && (
          <span className="text-muted-foreground">
            {t('maintenance.batteries.kmRun')}: <Km value={row.km_run} />
          </span>
        )}
      </div>
      <div className="text-muted-foreground">
        {slotLabel(row.slot)}
        {battery?.serial && (
          <>
            {' · '}
            {t('maintenance.batteries.serial')}: <bdi dir="ltr">{battery.serial}</bdi>
          </>
        )}
      </div>
      <div className="text-muted-foreground">
        {t('maintenance.batteries.fittedOn', { date: maintDate(row.installed_at, i18n.language) })}
        {row.installed_odometer !== null && (
          <>
            {' · '}
            <Km value={row.installed_odometer} />
          </>
        )}
      </div>
      <div className="text-muted-foreground">
        {t('maintenance.batteries.removedOn', { date: maintDate(row.removed_at, i18n.language) })}
        {row.removed_odometer !== null && (
          <>
            {' · '}
            <Km value={row.removed_odometer} />
          </>
        )}
        {row.removal_reason && ` · ${word('batteryRemovalReason', row.removal_reason)}`}
      </div>
      {row.removal_outcome && (
        <div className="text-muted-foreground">
          {t('maintenance.batteries.wentTo')}:{' '}
          <span className="font-medium text-foreground">
            {word('batteryOutcome', row.removal_outcome)}
          </span>
        </div>
      )}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
          {orders.map((order) => (
            <WorkOrderLink key={order.id} id={order.id} label={order.label} />
          ))}
        </div>
      )}
      {row.notes && (
        <p dir="auto" className="whitespace-pre-wrap text-muted-foreground">
          {row.notes}
        </p>
      )}
    </li>
  );
}

/**
 * The truck's battery slots, each with the battery in it now, then the ones
 * taken off it. Fitting and removing happen in the garage app; the office
 * only reads.
 */
export function BatterySlots({ batteries }: { batteries: VehicleBatteries }) {
  const { t } = useTranslation();
  const { slots, unplaced } = batterySlots(batteries.slots, batteries.fitted);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {slots.map(({ slot, install }) => (
          <SlotTile key={slot} slot={slot} install={install} />
        ))}
        {unplaced.map((install, i) => (
          <SlotTile key={install.install_id ?? `unplaced-${i}`} slot={install.slot} install={install} />
        ))}
      </div>
      {batteries.removed.length > 0 && (
        <CollapsibleSection
          title={t('maintenance.batteries.removedTitle', { n: batteries.removed.length })}
          defaultOpen={false}
        >
          <ul className="space-y-1.5 p-3">
            {batteries.removed.map((row, i) => (
              <RemovedItem key={row.install_id ?? `removed-${i}`} row={row} />
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
