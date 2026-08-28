import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  Edit3,
  FileText,
  Fuel,
  ImageIcon,
  Layers,
  Map,
  MapPin,
  Trash2,
  User,
  Calendar as CalendarIcon,
  DollarSign,
} from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import {
  groupTrips,
  type Trip,
  type TripListItem,
} from '@/entities/trip/schemas';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { format, formatCurrency, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { TripsRowExpanded } from './trips-row-expanded';
import { ReceiptStatusBadge } from './receipt-status-badge';
import { TripsMobileList } from './trips-mobile-list';

/* -------------------------------------------------------------------------- */
/* Receipt serialization badge                                                 */
/*                                                                             */
/* `receipt_valid === false` → the receipt number fails the terminal's         */
/* per-company serialization pattern. Overridden rows (user ticked "Save       */
/* anyway") get a distinct badge; null means no pattern configured — no badge. */
/* -------------------------------------------------------------------------- */

function ReceiptSerialBadge({
  trip,
}: {
  trip: Pick<Trip, 'receipt_valid' | 'receipt_override'>;
}) {
  const { t } = useTranslation();
  if (trip.receipt_valid !== false) return null;

  if (trip.receipt_override) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-transparent px-2 py-0.5 text-[10px] font-medium text-warning">
            <AlertTriangle className="h-3 w-3" />
            {t('trips.receiptSerial.overridden')}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t('trips.receiptSerial.overriddenTooltip')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
          <AlertTriangle className="h-3 w-3" />
          {t('trips.receiptSerial.invalid')}
        </span>
      </TooltipTrigger>
      <TooltipContent>{t('trips.receiptSerial.invalidTooltip')}</TooltipContent>
    </Tooltip>
  );
}

/* -------------------------------------------------------------------------- */
/* Public component                                                            */
/* -------------------------------------------------------------------------- */

interface TripsTableProps {
  trips: Trip[];
  loading: boolean;

  // Row-level actions
  onDelete: (id: number) => void;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;

  // Parent-row actions
  onDeleteParent: (parentId: number, count: number) => void;
  onOpenReceiptBatch: (parentId: number) => void;

  /** Optional empty-state action — usually "Add trip" link */
  emptyAction?: React.ReactNode;
}

/**
 * Trip list with parent-trip hierarchy.
 *
 *   - Standalone trips render as a single row.
 *   - Multi-container trips render as a parent header row whose chevron
 *     reveals each container as a subrow.
 *   - Any row (standalone, parent, or container) can be expanded to show
 *     the inline detail panel — receipt timeline, audit, map button.
 *
 * Two separate expansion states are kept on purpose because they answer
 * different questions ("show the children" vs. "show the detail panel").
 *
 * Mobile responsiveness is handled by hiding columns at md/lg/xl breakpoints
 * and inlining a compact `MobileSummary` block under the primary cell. We
 * don't ship a separate mobile component; the same table degrades gracefully.
 */
export function TripsTable({
  trips,
  loading,
  onDelete,
  onOpenReceipt,
  onOpenMap,
  onDeleteParent,
  onOpenReceiptBatch,
  emptyAction,
}: TripsTableProps) {
  const { t } = useTranslation();
  // Permission 4 sees money. The backend omits those fields below that level,
  // so this only decides whether the UI offers them at all.
  const { isAdmin: showRevenue } = usePermissions();

  // Group into standalone / parent buckets, preserve date-desc order.
  const items = React.useMemo<TripListItem[]>(() => {
    const grouped = groupTrips(trips);
    return grouped.sort((a, b) => {
      const dateA =
        a.type === 'standalone' ? a.trip.date : a.containers[0]?.date ?? '';
      const dateB =
        b.type === 'standalone' ? b.trip.date : b.containers[0]?.date ?? '';
      return dateB.localeCompare(dateA);
    });
  }, [trips]);

  const [expandedGroups, setExpandedGroups] = React.useState<Set<number>>(
    () => new Set(),
  );
  const [expandedDetailId, setExpandedDetailId] = React.useState<number | null>(
    null,
  );

  const toggleGroup = (parentId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const toggleDetail = (id: number) => {
    setExpandedDetailId((prev) => (prev === id ? null : id));
  };

  const isMobile = useIsMobile();

  if (!loading && items.length === 0) {
    return (
      <EmptyState
        lottieSrc="/animations/no_results.json"
        lottieWidth={100}
        lottieHeight={100}
        title={t('trips.empty.title')}
        description={t('trips.empty.description')}
        action={emptyAction}
      />
    );
  }

  if (isMobile) {
    return (
      <TripsMobileList
        items={items}
        loading={loading}
        showRevenue={showRevenue}
        onOpenReceipt={onOpenReceipt}
        onOpenMap={onOpenMap}
        onDelete={onDelete}
        onDeleteParent={onDeleteParent}
        onOpenReceiptBatch={onOpenReceiptBatch}
        emptyAction={emptyAction}
      />
    );
  }

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="h-11 w-10 px-2" aria-label="Expand" />
              <th className="h-11 px-4 text-start font-medium">
                {t('trips.columns.receipt')}
              </th>
              <th className="hidden h-11 px-4 text-start font-medium md:table-cell">
                {t('trips.columns.date')}
              </th>
              <th className="hidden h-11 px-4 text-start font-medium lg:table-cell">
                {t('trips.columns.company')}
              </th>
              <th className="hidden h-11 px-4 text-start font-medium lg:table-cell">
                {t('trips.columns.route')}
              </th>
              <th className="hidden h-11 px-4 text-start font-medium md:table-cell">
                {t('trips.columns.vehicleDriver')}
              </th>
              <th className="hidden h-11 px-4 text-start font-medium xl:table-cell">
                {t('trips.columns.tank')}
              </th>
              <th className="hidden h-11 px-4 text-end font-medium lg:table-cell">
                {t('trips.columns.distanceFee')}
              </th>
              <th className="hidden h-11 px-4 text-start font-medium md:table-cell">
                {t('trips.columns.status')}
              </th>
              <th className="h-11 px-4 text-end font-medium">
                {t('trips.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <SkeletonRows />
            ) : (
              items.map((item) =>
                item.type === 'standalone' ? (
                  <StandaloneRow
                    key={`s-${item.trip.ID}`}
                    trip={item.trip}
                    isExpanded={expandedDetailId === item.trip.ID}
                    onToggleDetail={() => toggleDetail(item.trip.ID)}
                    onDelete={onDelete}
                    onOpenReceipt={onOpenReceipt}
                    onOpenMap={onOpenMap}
                  />
                ) : (
                  <ParentRows
                    key={`p-${item.parentId}`}
                    item={item}
                    isGroupExpanded={expandedGroups.has(item.parentId)}
                    expandedDetailId={expandedDetailId}
                    onToggleGroup={() => toggleGroup(item.parentId)}
                    onToggleDetail={toggleDetail}
                    onDelete={onDelete}
                    onDeleteParent={onDeleteParent}
                    onOpenReceipt={onOpenReceipt}
                    onOpenMap={onOpenMap}
                    onOpenReceiptBatch={onOpenReceiptBatch}
                  />
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile Card components                                                      */
/* -------------------------------------------------------------------------- */

interface StandaloneRowProps {
  trip: Trip;
  isExpanded: boolean;
  onToggleDetail: () => void;
  onDelete: (id: number) => void;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;
}

function StandaloneRow({
  trip,
  isExpanded,
  onToggleDetail,
  onDelete,
  onOpenReceipt,
  onOpenMap,
}: StandaloneRowProps) {
  const { t } = useTranslation();
  const distance = trip.mileage || trip.distance || 0;

  return (
    <>
      <tr
        className={cn(
          'cursor-pointer border-b transition-colors hover:bg-muted/40',
          isExpanded && 'bg-muted/30',
        )}
        onClick={onToggleDetail}
      >
        <td className="w-10 px-2 align-middle">
          <ChevronCell expanded={isExpanded} />
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold tabular-nums">
                #{trip.receipt_no || '—'}
                <ReceiptSerialBadge trip={trip} />
              </div>
              <div className="text-xs text-muted-foreground">
                {t('trips.row.singleTrip')}
              </div>
              <MobileSummary trip={trip} />
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm tabular-nums md:table-cell">
          {format(trip.date, 'MMM d, yyyy')}
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm lg:table-cell">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate" title={trip.company}>
              {trip.company}
            </span>
          </span>
        </td>
        <td className="hidden max-w-[220px] px-4 py-3 align-middle lg:table-cell">
          <RoutePreview from={trip.terminal} to={trip.drop_off_point} />
        </td>
        <td className="hidden px-4 py-3 align-middle md:table-cell">
          <VehicleDriver trip={trip} />
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm tabular-nums xl:table-cell">
          <span className="inline-flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
            {formatNumber(trip.tank_capacity, 0)}L
          </span>
        </td>
        <td className="hidden px-4 py-3 align-middle text-end lg:table-cell">
          <DistanceFee distance={distance} money={tripMoney(trip)} />
        </td>
        <td className="hidden px-4 py-3 align-middle md:table-cell">
          <ReceiptStatusBadge trip={trip} />
        </td>
        <td className="px-4 py-3 align-middle text-end">
          <RowActions
            onOpenReceipt={() => onOpenReceipt(trip.ID)}
            onOpenMap={() => onOpenMap(trip.ID)}
            onDelete={() => onDelete(trip.ID)}
          />
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b">
          <td colSpan={10} className="bg-muted/20 p-0">
            <TripsRowExpanded
              trip={trip}
              onOpenReceipt={() => onOpenReceipt(trip.ID)}
              onOpenMap={() => onOpenMap(trip.ID)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Parent + container rows                                                     */
/* -------------------------------------------------------------------------- */

interface ParentRowsProps {
  item: Extract<TripListItem, { type: 'parent' }>;
  isGroupExpanded: boolean;
  expandedDetailId: number | null;
  onToggleGroup: () => void;
  onToggleDetail: (id: number) => void;
  onDelete: (id: number) => void;
  onDeleteParent: (parentId: number, count: number) => void;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;
  onOpenReceiptBatch: (parentId: number) => void;
}

function ParentRows({
  item,
  isGroupExpanded,
  expandedDetailId,
  onToggleGroup,
  onToggleDetail,
  onDeleteParent,
  onOpenReceipt,
  onOpenMap,
  onOpenReceiptBatch,
}: ParentRowsProps) {
  const { t } = useTranslation();
  const { parentId, parentTrip, containers } = item;
  const first = containers[0];
  const totalCapacity = containers.reduce(
    (sum, c) => sum + (c.tank_capacity || 0),
    0,
  );
  const totalDistance = containers.reduce(
    (sum, c) => sum + (c.mileage || c.distance || 0),
    0,
  );
  const totalFee = containers.reduce((sum, c) => sum + (c.fee || 0), 0);
  const hasReceiptBatch = !!parentTrip?.receipt_batch;
  const isWatanya = first.company === 'Watanya';

  return (
    <>
      {/* Parent header row */}
      <tr
        className={cn(
          'cursor-pointer border-b bg-primary/[0.04] transition-colors hover:bg-primary/[0.08]',
          isGroupExpanded && 'bg-primary/[0.06]',
        )}
        onClick={onToggleGroup}
      >
        <td className="w-10 px-2 align-middle">
          <ChevronCell expanded={isGroupExpanded} />
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Layers className="h-4 w-4" />
              {hasReceiptBatch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-warning" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('trips.row.hasReceiptBatch')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="min-w-0">
              {/* A parent holding ONE container is not a multi-container trip,
                  and 69% of parents hold exactly one. Labelling those
                  "Multi-container … 1 container" describes the database schema
                  rather than the trip, so a group of one shows its receipt
                  number like any other row. */}
              <div className="text-sm font-semibold">
                {containers.length > 1
                  ? t('trips.row.multiContainer', { id: parentId })
                  : `#${first.receipt_no || '—'}`}
              </div>
              {containers.length > 1 && (
                <div className="text-xs text-muted-foreground">
                  {t('trips.row.containersCount', { count: containers.length })}
                </div>
              )}
              <MobileSummary
                trip={first}
                parentTotal={{ capacity: totalCapacity, fee: totalFee }}
              />
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm tabular-nums md:table-cell">
          {format(first.date, 'MMM d, yyyy')}
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm lg:table-cell">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate" title={first.company}>
              {first.company}
            </span>
          </span>
        </td>
        <td className="hidden max-w-[220px] px-4 py-3 align-middle lg:table-cell">
          <div className="text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="truncate" title={first.terminal}>
                {first.terminal}
              </span>
            </div>
            <div className="ms-2.5 mt-0.5 text-muted-foreground">
              {t('trips.row.destinationsCount', { count: containers.length })}
            </div>
          </div>
        </td>
        <td className="hidden px-4 py-3 align-middle md:table-cell">
          <VehicleDriver trip={first} />
        </td>
        <td className="hidden px-4 py-3 align-middle text-sm tabular-nums xl:table-cell">
          <span className="inline-flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
            {formatNumber(totalCapacity, 0)}L
          </span>
        </td>
        <td className="hidden px-4 py-3 align-middle text-end lg:table-cell">
          <DistanceFee distance={totalDistance} money={groupMoney(containers, totalFee)} />
        </td>
        <td className="hidden px-4 py-3 align-middle text-xs text-muted-foreground md:table-cell">
          {/* Parents don't have a single status — containers carry it */}
        </td>
        <td className="px-4 py-3 align-middle text-end">
          <ParentRowActions
            parentId={parentId}
            isWatanya={isWatanya}
            hasReceiptBatch={hasReceiptBatch}
            containerCount={containers.length}
            onDeleteParent={onDeleteParent}
            onOpenReceiptBatch={onOpenReceiptBatch}
          />
        </td>
      </tr>

      {/* Container subrows (revealed when group expanded) */}
      {isGroupExpanded &&
        containers.map((container, idx) => {
          const isContainerExpanded = expandedDetailId === container.ID;
          const distance = container.mileage || container.distance || 0;
          return (
            <React.Fragment key={`c-${container.ID}`}>
              <tr
                className="cursor-pointer border-b bg-primary/[0.02] transition-colors hover:bg-primary/[0.06]"
                onClick={() => onToggleDetail(container.ID)}
              >
                <td className="w-10 px-2 align-middle">
                  <div className="ms-4">
                    <ChevronCell expanded={isContainerExpanded} />
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-2.5 ps-6">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-card text-xs font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium tabular-nums">
                        #{container.receipt_no || '—'}
                        <ReceiptSerialBadge trip={container} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('trips.row.containerN', { n: idx + 1 })}
                      </div>
                      <MobileSummary trip={container} />
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 align-middle md:table-cell" />
                <td className="hidden px-4 py-3 align-middle lg:table-cell" />
                <td className="hidden max-w-[220px] px-4 py-3 align-middle lg:table-cell">
                  <div className="flex items-center gap-1.5 ps-3 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    <span className="truncate" title={container.drop_off_point}>
                      {container.drop_off_point}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 align-middle md:table-cell" />
                <td className="hidden px-4 py-3 align-middle text-sm tabular-nums xl:table-cell">
                  <span className="inline-flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatNumber(container.tank_capacity, 0)}L
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-middle text-end lg:table-cell">
                  <DistanceFee distance={distance} money={tripMoney(container)} />
                </td>
                <td className="hidden px-4 py-3 align-middle md:table-cell">
                  <ReceiptStatusBadge trip={container} />
                </td>
                <td className="px-4 py-3 align-middle text-end">
                  <RowActions
                    onOpenReceipt={() => onOpenReceipt(container.ID)}
                    onOpenMap={() => onOpenMap(container.ID)}
                    // Individual containers of a parent trip cannot be deleted from the list
                    onDelete={undefined}
                  />
                </td>
              </tr>
              {isContainerExpanded && (
                <tr className="border-b">
                  <td colSpan={10} className="bg-muted/20 p-0">
                    <TripsRowExpanded
                      trip={container}
                      onOpenReceipt={() => onOpenReceipt(container.ID)}
                      onOpenMap={() => onOpenMap(container.ID)}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Cell components                                                             */
/* -------------------------------------------------------------------------- */

function ChevronCell({ expanded }: { expanded: boolean }) {
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground"
      aria-hidden
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      )}
    </span>
  );
}

function VehicleDriver({ trip }: { trip: Trip }) {
  return (
    <div className="space-y-0.5 text-sm">
      <div className="flex items-center gap-1.5">
        <Car className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium tabular-nums">{trip.car_no_plate}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="h-3 w-3" />
        <span className="truncate" title={trip.driver_name}>
          {trip.driver_name}
        </span>
      </div>
    </div>
  );
}

function RoutePreview({ from, to }: { from: string; to: string }) {
  return (
    <div className="space-y-0.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
        <span className="truncate" title={from}>
          {from}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
        <span className="truncate text-muted-foreground" title={to}>
          {to}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Distance and money                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Sum a revenue field across a group's containers, preserving "not permitted".
 *
 * Returns undefined if no container carries the field — which is what a caller
 * below permission 4 sees, and must not be flattened to a confident zero.
 */
export function sumRevenue(
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

/** One trip's money. `total` is undefined below permission 4. */
export function tripMoney(trip: Trip): Money {
  return {
    base: trip.revenue,
    rental: trip.allocated_rental,
    vat: trip.allocated_vat,
    total: trip.allocated_total,
    fee: trip.fee ?? 0,
  };
}

/** A parent's money: the sum of its containers'. */
export function groupMoney(containers: Trip[], totalFee: number): Money {
  return {
    base: sumRevenue(containers, 'revenue'),
    rental: sumRevenue(containers, 'allocated_rental'),
    vat: sumRevenue(containers, 'allocated_vat'),
    total: sumRevenue(containers, 'allocated_total'),
    fee: totalFee,
  };
}

interface Money {
  /** The trip's own earnings. */
  base?: number;
  /** Its share of car rental — see the note in the popover. */
  rental?: number;
  vat?: number;
  /** base + rental + vat. Undefined below permission 4. */
  total?: number;
  /** The route's fee mapping. A RATE for Petrol Arrows, a BAND for Watanya. */
  fee: number;
}

/**
 * The distance/money cell.
 *
 * Below permission 4 this is exactly what it always was: distance over fee, two
 * lines, no interaction. Nothing about the layout changes for those users.
 *
 * At permission 4 the second line becomes REVENUE and the fee moves into the
 * popover. That swap rather than an extra column is deliberate — the table
 * already carries ten columns and an eleventh crushed the route and vehicle
 * cells on a laptop. It is also the more honest arrangement: revenue is the
 * number someone came to this page for, and `fee` is an input to it (and for
 * Watanya not even money — a band from 1 to 15).
 */
function DistanceFee({ distance, money }: { distance: number; money: Money }) {
  const { t } = useTranslation();
  const showRevenue = money.total != null;

  const distanceLine = (
    <div className="flex items-center justify-end gap-1">
      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium">{formatNumber(distance, 1)} km</span>
    </div>
  );

  if (!showRevenue) {
    return (
      <div className="space-y-0.5 text-sm tabular-nums">
        {distanceLine}
        <div className="flex items-center justify-end gap-1 text-xs text-money">
          <DollarSign className="h-3 w-3" />
          <span className="font-semibold">{formatCurrency(money.fee)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 text-sm tabular-nums">
      {distanceLine}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-end gap-1 rounded text-xs text-money underline decoration-dotted underline-offset-4 hover:bg-money/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('trips.revenue.breakdownLabel')}
          >
            <DollarSign className="h-3 w-3 shrink-0" />
            <span className="font-semibold">{formatCurrency(money.total!)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <RevenueBreakdown money={money} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** The parts behind a revenue figure. Shared by the table and the cards. */
function RevenueBreakdown({ money }: { money: Money }) {
  const { t } = useTranslation();
  const line = (label: string, value: number, strong = false) => (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'font-semibold text-money' : 'font-medium')}>
        {formatCurrency(value)}
      </dd>
    </div>
  );

  return (
    <>
      <dl className="space-y-1.5 text-start text-sm">
        {line(t('trips.revenue.base'), money.base ?? 0)}
        {(money.rental ?? 0) !== 0 && line(t('trips.revenue.rentalShare'), money.rental ?? 0)}
        {(money.vat ?? 0) !== 0 && line(t('trips.revenue.vat'), money.vat ?? 0)}
        <div className="border-t pt-1.5">
          {line(t('trips.revenue.total'), money.total ?? 0, true)}
        </div>
        <div className="border-t pt-1.5">
          {line(t('trips.fields.fee'), money.fee)}
        </div>
      </dl>
      {(money.rental ?? 0) !== 0 && (
        <p className="mt-2 text-start text-xs leading-relaxed text-muted-foreground">
          {t('trips.revenue.shareHint')}
        </p>
      )}
    </>
  );
}


interface RowActionsProps {
  editPath?: string;
  onOpenReceipt: () => void;
  onOpenMap: () => void;
  onDelete?: () => void;
}

function MobileSummary({
  trip,
  parentTotal,
}: {
  trip: Trip;
  parentTotal?: { capacity: number; fee: number };
}) {
  const distance = trip.mileage || trip.distance || 0;
  return (
    <div className="mt-2 space-y-2.5 text-xs text-muted-foreground md:hidden border-t pt-2.5 border-primary/5">
      {/* Primary Detail Row (Date & Company) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <CalendarIcon className="h-3 w-3" />
          <span className="tabular-nums font-medium">
            {format(trip.date, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-start gap-1.5 font-semibold text-foreground text-end">
          <span className="leading-tight">{trip.company}</span>
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Driver & Vehicle Row */}
      <div className="flex flex-wrap items-center justify-between gap-y-1.5 bg-muted/40 rounded-md px-2 py-1.5">
        <div className="flex items-center gap-2 min-w-[140px] flex-1">
          <User className="h-3 w-3 shrink-0" />
          <span className="font-semibold text-foreground leading-tight">
            {trip.driver_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 tabular-nums shrink-0 ps-2 xs:border-s border-muted-foreground/20">
          <Car className="h-3 w-3 text-muted-foreground" />
          <span>{trip.car_no_plate}</span>
        </div>
      </div>

      {/* Route Row (Source -> Destination) */}
      <div className="space-y-2 relative ps-4 border-s border-dashed border-muted-foreground/40 ms-1.5 py-1">
        <div className="flex items-start gap-2">
          <span
            className="absolute -start-[3.5px] top-2 h-2 w-2 rounded-full bg-success ring-2 ring-background"
            aria-hidden
          />
          <span className="leading-snug break-words">{trip.terminal}</span>
        </div>
        <div className="flex items-start gap-2">
          <span
            className="absolute -start-[3.5px] bottom-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"
            aria-hidden
          />
          <span className="leading-snug font-medium text-foreground break-words">
            {trip.drop_off_point}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-bold">
          <span className="flex items-center gap-1">
            <Fuel className="h-2.5 w-2.5 text-muted-foreground" />
            {formatNumber(parentTotal?.capacity ?? trip.tank_capacity, 0)}L
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
            {formatNumber(distance, 1)} km
          </span>
        </div>
        <div className="flex items-center gap-1 text-money tabular-nums font-bold">
          <DollarSign className="h-3 w-3" />
          <span className="text-sm">
            {formatCurrency(parentTotal?.fee ?? trip.fee)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Action button groups                                                        */
/* -------------------------------------------------------------------------- */

interface RowActionsProps {
  editPath?: string;
  onOpenReceipt: () => void;
  onOpenMap: () => void;
  onDelete?: () => void;
}

function RowActions({
  editPath,
  onOpenReceipt,
  onOpenMap,
  onDelete,
}: RowActionsProps) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {editPath && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
              <Link to={editPath} aria-label={t('common.edit')}>
                <Edit3 className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('common.edit')}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onOpenMap}
            aria-label={t('trips.actions.viewOnMap')}
          >
            <MapPin className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('trips.actions.viewOnMap')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onOpenReceipt}
            aria-label={t('trips.actions.manageReceipts')}
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('trips.actions.manageReceipts')}</TooltipContent>
      </Tooltip>
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('common.delete')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

interface ParentRowActionsProps {
  parentId: number;
  isWatanya: boolean;
  hasReceiptBatch: boolean;
  containerCount: number;
  onDeleteParent: (id: number, count: number) => void;
  onOpenReceiptBatch: (id: number) => void;
}

function ParentRowActions({
  parentId,
  isWatanya,
  hasReceiptBatch,
  containerCount,
  onDeleteParent,
  onOpenReceiptBatch,
}: ParentRowActionsProps) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
            <Link
              to={`/trips/multi-container/${parentId}/edit`}
              aria-label={t('trips.actions.editMultiContainer')}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('trips.actions.editMultiContainer')}</TooltipContent>
      </Tooltip>
      {isWatanya && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
              <Link
                to={`/trips/parent/${parentId}/route-summary`}
                aria-label={t('trips.actions.viewRouteSummary')}
              >
                <Map className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trips.actions.viewRouteSummary')}</TooltipContent>
        </Tooltip>
      )}
      {hasReceiptBatch && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-warning hover:bg-warning/10 hover:text-warning"
              onClick={() => onOpenReceiptBatch(parentId)}
              aria-label={t('trips.actions.viewReceiptBatch')}
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('trips.actions.viewReceiptBatch')}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDeleteParent(parentId, containerCount)}
            aria-label={t('trips.actions.deleteMultiContainer')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('trips.actions.deleteMultiContainer')}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          <td colSpan={10} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// Re-export for convenience
export { ReceiptStatusBadge as TripsReceiptStatusBadge };
