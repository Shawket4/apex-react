import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, Layers, Map, ImageIcon, Edit3, Trash2 } from 'lucide-react';

import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/ui/empty-state';
import { format, formatCurrency, formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Truncate } from '@/shared/ui/truncate';
import { ReceiptStatusBadge } from './receipt-status-badge';
import { ContainerRevenue, RevenueBreakdown } from './revenue-breakdown';
import { DROP_SEPARATOR, groupByDate, type TripRow } from './trip-row';
import type { TripsDesktopTableProps } from './trips-desktop-table';

/* -------------------------------------------------------------------------- */
/* The trips list on a phone                                                   */
/*                                                                            */
/* Scan rows under sticky date headers. Two facts from the data shaped it:     */
/*                                                                            */
/*   Every trip in 2026 belongs to a parent — there are no standalone trips.   */
/*   69% of those parents hold exactly ONE container (2,454 of 3,504).         */
/*                                                                            */
/* So a "group" is usually just a trip. The card this replaces spent a 48px    */
/* icon tile, a route rail, a two-column driver grid and an expand chevron on  */
/* every one of them, at ~340px a row — two trips per screen. A group of one   */
/* now renders as a plain row with no group affordance at all, and only the    */
/* 31% carrying two or more get the count and the container list.              */
/* -------------------------------------------------------------------------- */

type Props = TripsDesktopTableProps;

export function TripsMobileList({
  rows,
  loading,
  showRevenue,
  onDelete,
  onOpenReceipt,
  onOpenMap,
  onDeleteParent,
  onOpenReceiptBatch,
  emptyAction,
}: Props) {
  const { t } = useTranslation();
  const days = React.useMemo(() => groupByDate(rows), [rows]);

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={t('trips.empty.title')} action={emptyAction} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {days.map((day) => (
        <section key={day.date}>
          {/* Sticky to the page scroll, so the day you are inside stays named.
              No day total: the list is paginated, and a total summed from a
              partial page would be confidently wrong. */}
          <h3
            className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-y
                       bg-muted/95 px-3 py-1.5 backdrop-blur
                       supports-[backdrop-filter]:bg-muted/80"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {format(day.date, 'EEE d MMM yyyy')}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t('trips.mobile.tripCount', { count: day.rows.length })}
            </span>
          </h3>

          {day.rows.map((row) => (
            <MobileRow
              key={row.key}
              row={row}
              showRevenue={showRevenue}
              onDelete={onDelete}
              onOpenReceipt={onOpenReceipt}
              onOpenMap={onOpenMap}
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

function MobileRow({
  row,
  showRevenue,
  onDelete,
  onOpenReceipt,
  onOpenMap,
  onDeleteParent,
  onOpenReceiptBatch,
}: { row: TripRow; showRevenue: boolean } & Pick<
  Props,
  'onDelete' | 'onOpenReceipt' | 'onOpenMap' | 'onDeleteParent' | 'onOpenReceiptBatch'
>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [money, setMoney] = React.useState(false);

  const { head, containers, isGroup } = row;
  const canSeeMoney = showRevenue && row.revenue != null;
  // The only trip edit route is trips/multi-container/:parentId/edit; a
  // standalone trip has nowhere to go, so it gets no edit action at all.
  const editPath =
    row.parentId != null ? `/trips/multi-container/${row.parentId}/edit` : null;

  return (
    <article className="border-b last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="cursor-pointer px-3 py-2.5 transition-colors hover:bg-muted/40
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
                   focus-visible:ring-ring active:bg-muted/60"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-2">
            {isGroup && (
              <span className="inline-flex shrink-0 items-baseline gap-1 rounded bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                <Layers className="h-2.5 w-2.5 self-center" aria-hidden />
                {containers.length}
              </span>
            )}
            {/* A group has no receipt of its own; the containers' numbers
                are listed on expand. */}
            {row.receiptNo ? (
              <span className="truncate font-mono text-[13px] font-medium tabular-nums">
                #{row.receiptNo}
              </span>
            ) : (
              <span className="truncate text-[12.5px] text-muted-foreground">
                {t('trips.mobile.receiptCount', { count: containers.length })}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <Truncate className="max-w-[110px]">{row.company}</Truncate>
            <ChevronDown
              aria-hidden
              className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
            />
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[13.5px] font-medium">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
          <Truncate className="min-w-0" dir="auto">
            {row.origin}
          </Truncate>
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            →
          </span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
          <Truncate className="min-w-0" dir="auto">
            {row.drops.join(DROP_SEPARATOR)}
          </Truncate>
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
            <span className="tabular-nums">{formatNumber(row.litres, 0)} L</span>
            {/* Flagged, because it is a furthest-drop figure and not a total —
                see TripRow.km. */}
            <span className="tabular-nums" title={row.kmIsMax ? t('trips.mobile.maxDistanceHint') : undefined}>
              {row.kmIsMax
                ? t('trips.mobile.maxDistance', { km: formatNumber(row.km, 0) })
                : `${formatNumber(row.km, 0)} km`}
            </span>
            {!isGroup && <ReceiptStatusBadge trip={head} compact />}
          </span>

          {canSeeMoney ? (
            <button
              type="button"
              aria-expanded={money}
              aria-label={t('trips.revenue.breakdownLabel')}
              onClick={(e) => {
                e.stopPropagation();
                setMoney((v) => !v);
              }}
              className="shrink-0 rounded font-mono text-[13.5px] font-semibold tabular-nums
                         text-money underline decoration-dotted underline-offset-4
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {formatCurrency(row.revenue!)}
            </button>
          ) : (
            <span className="shrink-0 font-mono text-[13.5px] font-semibold tabular-nums text-money">
              {formatCurrency(row.fee)}
            </span>
          )}
        </div>
      </div>

      {money && canSeeMoney && (
        <div className="border-t bg-money-soft px-3 py-2.5">
          <RevenueBreakdown containers={containers} />
        </div>
      )}

      {open && (
        <div className="border-t bg-muted/30 px-3 py-2.5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
            <Field label={t('trips.fields.driver')}>{head.driver_name}</Field>
            <Field label={t('trips.fields.vehicle')}>{head.car_no_plate}</Field>
            <Field label={t('trips.columns.tank')}>{formatNumber(row.litres, 0)} L</Field>
            <Field label={t('trips.fields.gasType')}>{head.gas_type || '—'}</Field>
          </dl>

          {/* Each container with its own revenue — they differ in volume,
              destination and therefore earnings, so repeating the parent's
              figure on every child would be a lie. */}
          {isGroup && (
            <div className="mt-3 border-t pt-2">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3 w-3" aria-hidden />
                {t('trips.mobile.containers', { count: containers.length })}
              </p>
              <ul className="divide-y">
                {containers.map((c, i) => (
                  <li key={c.ID} className="py-2 first:pt-0 last:pb-0">
                    {/* The drop-off owns its line. Beside the Latin receipt
                        number it reads in the opposite direction and truncated
                        on every row. */}
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 rounded border px-1 font-mono text-[10px] text-muted-foreground">
                        {i + 1}
                      </span>
                      <Truncate className="text-[13px] font-medium" dir="auto">
                        {c.drop_off_point}
                      </Truncate>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3 ps-7">
                      <span className="flex items-baseline gap-3 text-[11.5px] text-muted-foreground">
                        <span className="font-mono tabular-nums">#{c.receipt_no || '—'}</span>
                        <span className="tabular-nums">
                          {formatNumber(c.tank_capacity || 0, 0)} L
                        </span>
                        {/* The container's own distance; the row above shows
                            the trip's furthest drop. */}
                        <span className="tabular-nums">
                          {formatNumber(c.mileage || c.distance || 0, 0)} km
                        </span>
                      </span>
                      {showRevenue && (
                        <span className="shrink-0">
                          <ContainerRevenue container={c} />
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 border-t pt-2.5">
            {isGroup && row.parentId != null ? (
              <Action
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                onClick={() => onOpenReceiptBatch(row.parentId!)}
              >
                {t('trips.actions.viewReceiptBatch')}
              </Action>
            ) : (
              <>
                <Action
                  icon={<ImageIcon className="h-3.5 w-3.5" />}
                  onClick={() => onOpenReceipt(head.ID)}
                >
                  {t('trips.actions.manageReceipts')}
                </Action>
                <Action icon={<Map className="h-3.5 w-3.5" />} onClick={() => onOpenMap(head.ID)}>
                  {t('trips.actions.viewOnMap')}
                </Action>
              </>
            )}
            {editPath && (
              <Link
                to={editPath}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px]
                           font-medium transition-colors hover:bg-muted focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {t('common.edit')}
              </Link>
            )}
            <Action
              danger
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() =>
                isGroup && row.parentId != null
                  ? onDeleteParent(row.parentId, containers.length)
                  : onDelete(head.ID)
              }
            >
              {t('common.delete')}
            </Action>
          </div>
        </div>
      )}
    </article>
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

function Action({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
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
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        danger
          ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
          : 'hover:bg-muted',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
