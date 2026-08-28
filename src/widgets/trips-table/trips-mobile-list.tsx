import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ChevronDown, MapPin, Fuel, User, Truck, Layers } from 'lucide-react';

import { type Trip, type TripListItem } from '@/entities/trip/schemas';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { format, formatCurrency, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { ReceiptStatusBadge } from './receipt-status-badge';

/* -------------------------------------------------------------------------- */
/* The mobile trips list                                                       */
/*                                                                            */
/* Scan rows under sticky date headers. Two facts from the data drove this:   */
/*                                                                            */
/*   Every trip in 2026 belongs to a parent — there are no standalone trips.  */
/*   69% of those parents hold exactly ONE container (2,454 of 3,504).        */
/*                                                                            */
/* So a "group" is usually just a trip. The card this replaces spent a 48px   */
/* icon tile, a route rail, a two-column driver grid and an expand chevron on */
/* every one of them, at ~340px a row — two trips per screen. Here a          */
/* one-container group renders as a plain row with no group affordance at     */
/* all, and only the 31% that carry two or more get the chevron and the       */
/* container list.                                                            */
/* -------------------------------------------------------------------------- */

/** Litres and kilometres, or km alone for the distance-billed companies. */
const DISTANCE_BILLED = new Set(['TAQA', 'Petromin']);

interface Props {
  items: TripListItem[];
  loading: boolean;
  showRevenue: boolean;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;
  onDelete: (id: number) => void;
  onDeleteParent: (parentId: number, count: number) => void;
  onOpenReceiptBatch: (parentId: number) => void;
  emptyAction?: React.ReactNode;
}

/** The containers a list item represents. A standalone trip is a group of one. */
function containersOf(item: TripListItem): Trip[] {
  return item.type === 'standalone' ? [item.trip] : item.containers;
}

function itemKey(item: TripListItem): string {
  return item.type === 'standalone' ? `s-${item.trip.ID}` : `p-${item.parentId}`;
}

function itemDate(item: TripListItem): string {
  return (containersOf(item)[0]?.date ?? '').slice(0, 10);
}

export function TripsMobileList({
  items,
  loading,
  showRevenue,
  onOpenReceipt,
  onOpenMap,
  onDelete,
  onDeleteParent,
  onOpenReceiptBatch,
  emptyAction,
}: Props) {
  const { t } = useTranslation();

  // Consecutive runs of the same date. The list already arrives date-desc, so
  // this is a scan rather than a sort — re-sorting here would fight whatever
  // ordering the server chose.
  const days = React.useMemo(() => {
    const out: { date: string; items: TripListItem[] }[] = [];
    for (const item of items) {
      const date = itemDate(item);
      const last = out[out.length - 1];
      if (last && last.date === date) last.items.push(item);
      else out.push({ date, items: [item] });
    }
    return out;
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState title={t('trips.empty.title')} action={emptyAction} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {days.map((day) => (
        <section key={day.date}>
          {/* Sticky to the page scroll, so the day you are inside stays named.
              No day total here on purpose: the list is paginated, and a total
              summed from a partial page would be confidently wrong. */}
          <h3
            className="sticky top-0 z-10 flex items-baseline justify-between gap-3
                       border-y bg-muted/90 px-3 py-1.5 backdrop-blur
                       supports-[backdrop-filter]:bg-muted/70"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
              {format(day.date, 'EEE d MMM yyyy')}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t('trips.mobile.tripCount', { count: day.items.length })}
            </span>
          </h3>

          {day.items.map((item) => (
            <TripRow
              key={itemKey(item)}
              item={item}
              showRevenue={showRevenue}
              onOpenReceipt={onOpenReceipt}
              onOpenMap={onOpenMap}
              onDelete={onDelete}
              onDeleteParent={onDeleteParent}
              onOpenReceiptBatch={onOpenReceiptBatch}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* One row                                                                     */
/* -------------------------------------------------------------------------- */

function TripRow({
  item,
  showRevenue,
  onOpenReceipt,
  onOpenMap,
  onDelete,
  onDeleteParent,
  onOpenReceiptBatch,
}: {
  item: TripListItem;
  showRevenue: boolean;
} & Pick<
  Props,
  'onOpenReceipt' | 'onOpenMap' | 'onDelete' | 'onDeleteParent' | 'onOpenReceiptBatch'
>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [showMoney, setShowMoney] = React.useState(false);

  const containers = containersOf(item);
  const head = containers[0];
  if (!head) return null;

  // A group of one is not a group. Only a real multi-drop trip earns the
  // chevron, the drop count and the container list.
  const isGroup = containers.length > 1;

  const litres = containers.reduce((s, c) => s + (c.tank_capacity || 0), 0);
  const km = containers.reduce((s, c) => s + (c.mileage || c.distance || 0), 0);
  const total = sum(containers, 'allocated_total');

  // Distinct drop-off points, in order, joined with an Arabic comma when the
  // content is Arabic — the list is overwhelmingly Arabic place names.
  const drops = Array.from(new Set(containers.map((c) => c.drop_off_point).filter(Boolean)));

  return (
    <article className="border-b last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="w-full cursor-pointer px-3 py-2.5 text-start transition-colors
                   hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-inset focus-visible:ring-ring active:bg-muted/60"
      >
        {/* Receipt and provenance */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[13px] font-medium tabular-nums">
            #{head.receipt_no || '—'}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{head.company}</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-transform',
                open && 'rotate-180',
              )}
            />
          </span>
        </div>

        {/* Route */}
        <div className="mt-1 flex items-center gap-1.5 text-[13.5px] font-medium">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
          <span className="min-w-0 truncate" dir="auto">
            {head.terminal}
          </span>
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            →
          </span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
          <span className="min-w-0 truncate" dir="auto">
            {drops.join('، ')}
          </span>
        </div>

        {/* Quantities against the money */}
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
            {isGroup && (
              <span className="rounded-full bg-accent px-1.5 font-semibold text-accent-foreground">
                {t('trips.mobile.drops', { count: containers.length })}
              </span>
            )}
            <span className="tabular-nums">{formatNumber(litres, 0)} L</span>
            <span className="tabular-nums">{formatNumber(km, 0)} km</span>
            <ReceiptStatusBadge trip={head} compact />
          </span>

          {showRevenue && total != null ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoney((v) => !v);
              }}
              aria-expanded={showMoney}
              className="shrink-0 rounded font-mono text-[13.5px] font-semibold tabular-nums
                         text-money underline decoration-dotted underline-offset-4
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {formatCurrency(total)}
            </button>
          ) : (
            <span className="shrink-0 font-mono text-[13.5px] font-semibold tabular-nums text-money">
              {formatCurrency(containers.reduce((s, c) => s + (c.fee || 0), 0))}
            </span>
          )}
        </div>
      </div>

      {showMoney && showRevenue && (
        <MoneyBreakdown containers={containers} />
      )}

      {open && (
        <TripDetail
          item={item}
          containers={containers}
          isGroup={isGroup}
          showRevenue={showRevenue}
          onOpenReceipt={onOpenReceipt}
          onOpenMap={onOpenMap}
          onDelete={onDelete}
          onDeleteParent={onDeleteParent}
          onOpenReceiptBatch={onOpenReceiptBatch}
        />
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

function sum(
  trips: Trip[],
  key: 'revenue' | 'allocated_rental' | 'allocated_vat' | 'allocated_total',
): number | undefined {
  let total: number | undefined;
  for (const trip of trips) {
    const value = trip[key];
    if (value == null) continue;
    total = (total ?? 0) + value;
  }
  return total;
}

/**
 * What a container was charged on.
 *
 * `fee` means a different thing per company, which is why this cannot be one
 * format string: it is a rate per 1,000 L for Petrol Arrows, a BAND NUMBER
 * from 1 to 15 for Watanya, and nothing at all for TAQA and Petromin, which
 * bill on distance. Rates are deliberately not restated here — they live in
 * the backend's revenue module and duplicating them is how the two drifted
 * apart in the first place.
 */
function feeBasis(trip: Trip, t: TFunction): string {
  const km = trip.mileage || trip.distance || 0;
  if (DISTANCE_BILLED.has(trip.company)) {
    return `${formatNumber(km, 0)} km`;
  }
  const litres = formatNumber(trip.tank_capacity || 0, 0);
  if (trip.company === 'Watanya') {
    return t('trips.revenue.atBand', { volume: litres, band: trip.fee ?? 0 });
  }
  return t('trips.revenue.atRate', { volume: litres, rate: formatNumber(trip.fee ?? 0, 2) });
}

/**
 * The parts behind a revenue figure, with one fee line per container.
 *
 * A multi-drop trip can carry different volumes to different routes, and each
 * route has its own fee mapping — the real shape in production is one truck
 * dropping 13,000 L and 26,000 L at one place and 13,000 L at another. A single
 * "Fee" line cannot describe that, so each container states its own basis.
 */
function MoneyBreakdown({ containers }: { containers: Trip[] }) {
  const { t } = useTranslation();
  const base = sum(containers, 'revenue') ?? 0;
  const rental = sum(containers, 'allocated_rental') ?? 0;
  const vat = sum(containers, 'allocated_vat') ?? 0;
  const total = sum(containers, 'allocated_total') ?? 0;

  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono tabular-nums',
          strong ? 'font-semibold text-money' : 'text-foreground/90',
        )}
      >
        {value}
      </dd>
    </div>
  );

  // With no rental and no VAT the base IS the total, and printing both is the
  // same number twice. Petrol Arrows is always in that state, so this is the
  // common case rather than an edge one.
  const hasParts = rental !== 0 || vat !== 0;

  return (
    <div className="border-t bg-money-soft px-3 py-2.5 text-[12.5px]">
      <dl className="space-y-1">
        {hasParts && (
          <>
            <Row label={t('trips.revenue.base')} value={formatCurrency(base)} />
            {rental !== 0 && (
              <Row label={t('trips.revenue.rentalShare')} value={formatCurrency(rental)} />
            )}
            {vat !== 0 && <Row label={t('trips.revenue.vat')} value={formatCurrency(vat)} />}
          </>
        )}
        <div className={cn(hasParts && 'border-t pt-1')}>
          <Row label={t('trips.revenue.total')} value={formatCurrency(total)} strong />
        </div>
      </dl>

      <dl className="mt-2 space-y-1 border-t pt-2">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('trips.revenue.chargedOn')}
        </dt>
        {containers.map((c, i) => (
          <dd key={c.ID} className="flex items-baseline justify-between gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              {containers.length > 1 && (
                <span className="rounded border px-1 font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
              )}
              <span className="truncate text-muted-foreground" dir="auto">
                {feeBasis(c, t)}
              </span>
            </span>
            {c.revenue != null && (
              <span className="shrink-0 font-mono tabular-nums text-foreground/90">
                {formatCurrency(c.revenue)}
              </span>
            )}
          </dd>
        ))}
      </dl>

      {rental !== 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {t('trips.revenue.shareHint')}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Expanded detail                                                             */
/* -------------------------------------------------------------------------- */

function TripDetail({
  item,
  containers,
  isGroup,
  showRevenue,
  onOpenReceipt,
  onOpenMap,
  onDelete,
  onDeleteParent,
  onOpenReceiptBatch,
}: {
  item: TripListItem;
  containers: Trip[];
  isGroup: boolean;
  showRevenue: boolean;
} & Pick<
  Props,
  'onOpenReceipt' | 'onOpenMap' | 'onDelete' | 'onDeleteParent' | 'onOpenReceiptBatch'
>) {
  const { t } = useTranslation();
  const head = containers[0]!;

  return (
    <div className="border-t bg-muted/30 px-3 py-2.5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <Field icon={<User className="h-3 w-3" />} label={t('trips.fields.driver')}>
          {head.driver_name}
        </Field>
        <Field icon={<Truck className="h-3 w-3" />} label={t('trips.fields.vehicle')}>
          {head.car_no_plate}
        </Field>
        <Field icon={<Fuel className="h-3 w-3" />} label={t('trips.columns.tank')}>
          {formatNumber(containers.reduce((s, c) => s + (c.tank_capacity || 0), 0), 0)} L
        </Field>
        <Field icon={<MapPin className="h-3 w-3" />} label={t('trips.columns.distanceFee')}>
          {formatNumber(containers.reduce((s, c) => s + (c.mileage || c.distance || 0), 0), 1)} km
        </Field>
      </dl>

      {/* Every container, each with its own revenue — a multi-drop trip's
          containers can differ in volume, destination and therefore earnings,
          so repeating the parent's figure on each would be a lie. */}
      {isGroup && (
        <div className="mt-3 border-t pt-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3 w-3" />
            {t('trips.mobile.containers', { count: containers.length })}
          </p>
          <ul className="space-y-1">
            {containers.map((c, i) => (
              <li
                key={c.ID}
                className="flex items-baseline justify-between gap-3 border-s-2 ps-2 text-[12.5px]"
              >
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="rounded border px-1 font-mono text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="truncate" dir="auto">
                    {c.drop_off_point}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2.5">
                  <span className="tabular-nums text-muted-foreground">
                    {formatNumber(c.tank_capacity || 0, 0)} L
                  </span>
                  {showRevenue && c.allocated_total != null && (
                    <span className="font-mono font-semibold tabular-nums text-money">
                      {formatCurrency(c.allocated_total)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t pt-2.5">
        <Action onClick={() => onOpenReceipt(head.ID)}>{t('trips.actions.manageReceipts')}</Action>
        <Action onClick={() => onOpenMap(head.ID)}>{t('trips.actions.viewOnMap')}</Action>
        {item.type === 'parent' && (
          <Action onClick={() => onOpenReceiptBatch(item.parentId)}>
            {t('trips.actions.viewReceiptBatch')}
          </Action>
        )}
        {item.type === 'standalone' ? (
          <Action danger onClick={() => onDelete(head.ID)}>
            {t('common.delete')}
          </Action>
        ) : (
          <Action danger onClick={() => onDeleteParent(item.parentId, containers.length)}>
            {t('common.delete')}
          </Action>
        )}
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium" dir="auto">
        {children}
      </dd>
    </div>
  );
}

function Action({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        danger
          ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
          : 'hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
