import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Edit3,
  ImageIcon,
  Layers,
  Map,
  Trash2,
  Truck,
  User,
} from 'lucide-react';

import type { Trip } from '@/entities/trip/schemas';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { format, formatCurrency, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useQueryClient } from '@tanstack/react-query';
import { intentProps, warmTripForm } from '@/shared/lib/prefetch';
import { prefetchParentContainers, prefetchTripDetails } from '@/entities/trip/queries';
import { Truncate } from '@/shared/ui/truncate';
import { ReceiptStatusBadge } from './receipt-status-badge';
import { ContainerRevenue, RevenueBreakdown } from './revenue-breakdown';
import { DROP_SEPARATOR, type TripRow } from './trip-row';

/* -------------------------------------------------------------------------- */
/* The trips table                                                             */
/*                                                                            */
/* Rebuilt on one rule: alignment encodes the kind of value. Text starts,      */
/* figures end, status centres. The table this replaces aligned tank, distance */
/* and fee three different ways, so the eye had no column to follow down, and  */
/* mixed four padding scales between the header and the body.                  */
/*                                                                            */
/* Nine columns, and no tenth: at permission 4 the Distance cell's second line */
/* becomes REVENUE and the fee moves into its popover. An extra column crushed */
/* the route and vehicle cells on a laptop, and revenue is the number people   */
/* come to this page for while `fee` is only an input to it — for Watanya not  */
/* even money, but a band from 1 to 15.                                        */
/* -------------------------------------------------------------------------- */

export interface TripsDesktopTableProps {
  rows: TripRow[];
  loading: boolean;
  showRevenue: boolean;
  onDelete: (id: number) => void;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;
  onDeleteParent: (parentId: number, count: number) => void;
  onOpenReceiptBatch: (parentId: number) => void;
  emptyAction?: React.ReactNode;
}

/** Column count, for the expanded row's colSpan. */
const COLUMNS = 9;

export function TripsDesktopTable({
  rows,
  loading,
  showRevenue,
  onDelete,
  onOpenReceipt,
  onOpenMap,
  onDeleteParent,
  onOpenReceiptBatch,
  emptyAction,
}: TripsDesktopTableProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState<string | null>(null);

  if (!loading && rows.length === 0) {
    return <EmptyState title={t('trips.empty.title')} action={emptyAction} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full caption-bottom border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Th className="w-9" srOnly>
                {t('trips.columns.expand', { defaultValue: 'Expand' })}
              </Th>
              <Th>{t('trips.columns.receipt')}</Th>
              <Th className="hidden md:table-cell">{t('trips.columns.date')}</Th>
              <Th className="hidden lg:table-cell">{t('trips.columns.company')}</Th>
              <Th className="hidden lg:table-cell">{t('trips.columns.route')}</Th>
              <Th className="hidden md:table-cell">{t('trips.columns.vehicleDriver')}</Th>
              <Th align="end" className="hidden xl:table-cell">
                {t('trips.columns.tank')}
              </Th>
              <Th align="end" className="hidden lg:table-cell">
                {t('trips.columns.distanceFee')}
              </Th>
              <Th align="center" className="hidden md:table-cell">
                {t('trips.columns.status')}
              </Th>
              <Th align="end">{t('trips.columns.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.map((row) => (
                  <Row
                    key={row.key}
                    row={row}
                    showRevenue={showRevenue}
                    isExpanded={expanded === row.key}
                    onToggle={() => setExpanded((k) => (k === row.key ? null : row.key))}
                    onDelete={onDelete}
                    onOpenReceipt={onOpenReceipt}
                    onOpenMap={onOpenMap}
                    onDeleteParent={onDeleteParent}
                    onOpenReceiptBatch={onOpenReceiptBatch}
                  />
                ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Header cell                                                                 */
/* -------------------------------------------------------------------------- */

function Th({
  children,
  align = 'start',
  className,
  srOnly,
}: {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
  srOnly?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 whitespace-nowrap px-3 font-semibold',
        align === 'start' && 'text-start',
        align === 'end' && 'text-end',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

/** One body cell, on the single padding scale the whole table uses. */
function Td({
  children,
  align = 'start',
  className,
}: {
  children?: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle',
        align === 'start' && 'text-start',
        align === 'end' && 'text-end',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

function Row({
  row,
  showRevenue,
  isExpanded,
  onToggle,
  onDelete,
  onOpenReceipt,
  onOpenMap,
  onDeleteParent,
  onOpenReceiptBatch,
}: {
  row: TripRow;
  showRevenue: boolean;
  isExpanded: boolean;
  onToggle: () => void;
} & Pick<
  TripsDesktopTableProps,
  'onDelete' | 'onOpenReceipt' | 'onOpenMap' | 'onDeleteParent' | 'onOpenReceiptBatch'
>) {
  const { t } = useTranslation();
  const { head, containers, isGroup } = row;

  return (
    <>
      <tr
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'cursor-pointer border-b transition-colors hover:bg-muted/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          isExpanded && 'bg-muted/40',
        )}
      >
        <Td align="center">
          <ChevronRight
            aria-hidden
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90',
            )}
          />
        </Td>

        <Td>
          <div className="flex items-center gap-2">
            {isGroup && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5
                           text-[10.5px] font-medium text-muted-foreground"
                title={t('trips.mobile.containers', { count: containers.length })}
              >
                <Layers className="h-3 w-3" />
                {containers.length}
              </span>
            )}
            {/* A group has no receipt of its own — each container carries
                one, and showing the first child's number would present one
                trip's paperwork as the whole group's. The numbers themselves
                are one click away in the expanded list. */}
            {row.receiptNo ? (
              <span className="font-mono text-[13px] font-medium tabular-nums">
                #{row.receiptNo}
              </span>
            ) : (
              <span className="whitespace-nowrap text-[12.5px] text-muted-foreground">
                {t('trips.mobile.receiptCount', { count: containers.length })}
              </span>
            )}
          </div>
        </Td>

        <Td className="hidden whitespace-nowrap font-mono text-[12.5px] tabular-nums md:table-cell">
          {format(row.date, 'd MMM yyyy')}
        </Td>

        <Td className="hidden max-w-[130px] lg:table-cell">
          <Truncate className="text-[13px]">{row.company}</Truncate>
        </Td>

        <Td className="hidden max-w-[230px] lg:table-cell">
          <Route origin={row.origin} drops={row.drops} />
        </Td>

        <Td className="hidden max-w-[180px] md:table-cell">
          <VehicleDriver trip={head} />
        </Td>

        <Td align="end" className="hidden whitespace-nowrap font-mono text-[12.5px] tabular-nums xl:table-cell">
          {formatNumber(row.litres, 0)} L
        </Td>

        <Td align="end" className="hidden lg:table-cell">
          <DistanceMoney row={row} showRevenue={showRevenue} />
        </Td>

        <Td align="center" className="hidden md:table-cell">
          {isGroup ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <ReceiptStatusBadge trip={head} />
          )}
        </Td>

        <Td align="end">
          <RowActions
            row={row}
            onDelete={onDelete}
            onOpenReceipt={onOpenReceipt}
            onOpenMap={onOpenMap}
            onDeleteParent={onDeleteParent}
            onOpenReceiptBatch={onOpenReceiptBatch}
          />
        </Td>
      </tr>

      {isExpanded && (
        <tr className="border-b bg-muted/40">
          <td colSpan={COLUMNS + 1} className="px-3 py-3">
            <Expanded row={row} showRevenue={showRevenue} onOpenReceipt={onOpenReceipt} onOpenMap={onOpenMap} />
          </td>
        </tr>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Cells                                                                       */
/* -------------------------------------------------------------------------- */

/** Origin to destination on one line. Two stacked lines read as two unrelated
 *  places rather than a journey, and cost a second line of height to do it. */
function Route({ origin, drops }: { origin: string; drops: string[] }) {
  const to = drops.join(DROP_SEPARATOR);
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
      <Truncate dir="auto">{origin}</Truncate>
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        →
      </span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
      <Truncate dir="auto">{to}</Truncate>
    </div>
  );
}

function VehicleDriver({ trip }: { trip: Trip }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <Truncate className="font-mono text-[12.5px]" dir="auto">
          {trip.car_no_plate}
        </Truncate>
      </div>
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
        <User className="h-3 w-3 shrink-0" aria-hidden />
        <Truncate dir="auto">{trip.driver_name}</Truncate>
      </div>
    </div>
  );
}

/**
 * Distance over money.
 *
 * Below permission 4 the second line is the fee, exactly as it always was.
 * At permission 4 it is revenue, pressable, with the fee inside the breakdown.
 */
function DistanceMoney({ row, showRevenue }: { row: TripRow; showRevenue: boolean }) {
  const { t } = useTranslation();
  const canSee = showRevenue && row.revenue != null;

  return (
    <div className="space-y-0.5">
      {/* A furthest-drop figure for a multi-drop trip, not a total, and
          labelled so nobody reads it as one. */}
      <div
        className="whitespace-nowrap font-mono text-[12.5px] tabular-nums"
        title={row.kmIsMax ? t('trips.mobile.maxDistanceHint') : undefined}
      >
        {row.kmIsMax
          ? t('trips.mobile.maxDistance', { km: formatNumber(row.km, 0) })
          : `${formatNumber(row.km, 0)} km`}
      </div>
      {canSee ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label={t('trips.revenue.breakdownLabel')}
              className="w-full whitespace-nowrap rounded text-end font-mono text-[12.5px]
                         font-semibold tabular-nums text-money underline decoration-dotted
                         underline-offset-4 hover:bg-money/10 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-ring"
            >
              {formatCurrency(row.revenue!)}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <RevenueBreakdown containers={row.containers} />
          </PopoverContent>
        </Popover>
      ) : (
        <div className="whitespace-nowrap font-mono text-[12.5px] font-semibold tabular-nums text-money">
          {formatCurrency(row.fee)}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Expanded                                                                    */
/* -------------------------------------------------------------------------- */

function Expanded({
  row,
  showRevenue,
  onOpenReceipt,
  onOpenMap,
}: {
  row: TripRow;
  showRevenue: boolean;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;
}) {
  const { t } = useTranslation();

  if (!row.isGroup) {
    return (
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px] sm:grid-cols-4">
        <Field label={t('trips.fields.driver')}>{row.head.driver_name}</Field>
        <Field label={t('trips.fields.vehicle')}>{row.head.car_no_plate}</Field>
        <Field label={t('trips.columns.tank')}>{formatNumber(row.litres, 0)} L</Field>
        <Field label={t('trips.fields.gasType')}>{row.head.gas_type || '—'}</Field>
      </dl>
    );
  }

  // Every container with its own revenue. Repeating the parent's figure on each
  // child would be a lie: containers differ in volume, destination and earnings.
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Layers className="h-3 w-3" aria-hidden />
        {t('trips.mobile.containers', { count: row.containers.length })}
      </p>
      {/* A list, not a table. The drop-off is Arabic and the receipt number is
          Latin digits; side by side in a squeezed cell they read in opposite
          directions and the name truncated on every row. The name now owns its
          line and everything measurable sits underneath it. */}
      <ul className="divide-y">
        {row.containers.map((c, i) => (
          <li key={c.ID} className="py-2 first:pt-0 last:pb-0">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 rounded border px-1 font-mono text-[10px] text-muted-foreground">
                {i + 1}
              </span>
              <Truncate className="text-[13px] font-medium" dir="auto">
                {c.drop_off_point}
              </Truncate>
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 ps-7">
              <span className="flex items-center gap-4 text-[12px] text-muted-foreground">
                <span className="font-mono tabular-nums">#{c.receipt_no || '—'}</span>
                <span className="font-mono tabular-nums">
                  {formatNumber(c.tank_capacity || 0, 0)} L
                </span>
                {/* Each container's OWN distance. The row above shows the
                    trip's furthest drop; these are the individual drops that
                    the furthest one is the maximum of. */}
                <span className="font-mono tabular-nums">
                  {formatNumber(c.mileage || c.distance || 0, 0)} km
                </span>
                <ReceiptStatusBadge trip={c} compact />
              </span>

              <span className="flex items-center gap-2">
                {showRevenue && <ContainerRevenue container={c} />}
                <IconButton
                  label={t('trips.actions.manageReceipts')}
                  onClick={() => onOpenReceipt(c.ID)}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label={t('trips.actions.viewOnMap')} onClick={() => onOpenMap(c.ID)}>
                  <Map className="h-3.5 w-3.5" />
                </IconButton>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">
        <Truncate dir="auto">{children}</Truncate>
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

function IconButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn('h-7 w-7', danger && 'text-destructive hover:text-destructive')}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

function RowActions({
  row,
  onDelete,
  onOpenReceipt,
  onOpenMap,
  onDeleteParent,
  onOpenReceiptBatch,
}: { row: TripRow } & Pick<
  TripsDesktopTableProps,
  'onDelete' | 'onOpenReceipt' | 'onOpenMap' | 'onDeleteParent' | 'onOpenReceiptBatch'
>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { head, containers, isGroup, parentId } = row;
  // The ONLY trip edit route is trips/multi-container/:parentId/edit. There is
  // no trips/:id/edit, so a standalone trip has nowhere to go and gets no edit
  // action rather than a link to a 404.
  const editPath =
    parentId != null ? `/trips/multi-container/${parentId}/edit` : null;

  // Intent: the edit page mounts the parent's containers; the map dialog
  // mounts the trip details. Warm each when the cursor reaches its control,
  // so the click opens onto data already in cache.
  const warmEdit = () => {
    warmTripForm(queryClient, 'trip-edit');
    if (parentId != null) prefetchParentContainers(queryClient, parentId);
  };
  const warmMap = () => prefetchTripDetails(queryClient, head.ID);

  return (
    <div className="flex items-center justify-end gap-1">
      {isGroup && parentId != null && (
        <IconButton
          label={t('trips.actions.viewReceiptBatch')}
          onClick={() => onOpenReceiptBatch(parentId)}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </IconButton>
      )}
      {!isGroup && (
        <>
          <IconButton label={t('trips.actions.manageReceipts')} onClick={() => onOpenReceipt(head.ID)}>
            <ImageIcon className="h-3.5 w-3.5" />
          </IconButton>
          <span {...intentProps(warmMap)} className="contents">
            <IconButton label={t('trips.actions.viewOnMap')} onClick={() => onOpenMap(head.ID)}>
              <Map className="h-3.5 w-3.5" />
            </IconButton>
          </span>
        </>
      )}
      {editPath && (
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
          {...intentProps(warmEdit)}
        >
          <Link to={editPath} aria-label={t('common.edit')} title={t('common.edit')}>
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
      <IconButton
        danger
        label={t('common.delete')}
        onClick={() =>
          isGroup && parentId != null
            ? onDeleteParent(parentId, containers.length)
            : onDelete(head.ID)
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b">
      {Array.from({ length: COLUMNS + 1 }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
