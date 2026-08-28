import * as React from 'react';

import { groupTrips, type Trip, type TripListItem } from '@/entities/trip/schemas';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { toRow, type TripRow } from './trip-row';
import { TripsDesktopTable } from './trips-desktop-table';
import { TripsMobileList } from './trips-mobile-list';

/* -------------------------------------------------------------------------- */
/* Trips list                                                                  */
/*                                                                            */
/* A switch, and nothing else. Both surfaces render the same TripRow model     */
/* (see trip-row.ts), so the only difference between them is presentation —    */
/* which is what stops them disagreeing about what a row means. This file used */
/* to be a thousand lines carrying two full implementations that had already   */
/* drifted apart.                                                              */
/* -------------------------------------------------------------------------- */

export interface TripsTableProps {
  trips: Trip[];
  loading: boolean;

  onDelete: (id: number) => void;
  onOpenReceipt: (id: number) => void;
  onOpenMap: (id: number) => void;

  onDeleteParent: (parentId: number, count: number) => void;
  onOpenReceiptBatch: (parentId: number) => void;

  /** Usually the "Add trip" link. */
  emptyAction?: React.ReactNode;
}

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
  const isMobile = useIsMobile();

  // Permission 4 sees money. The backend omits those fields below that level,
  // so this only decides whether the UI offers them — a caller without the
  // permission never receives a figure that some layer above must remember to
  // strip.
  const { atLeast } = usePermissions();
  const showRevenue = atLeast(PERMISSION_LEVELS.ADMIN);

  const rows = React.useMemo<TripRow[]>(() => {
    const items: TripListItem[] = groupTrips(trips);
    return items
      .map(toRow)
      .filter((row): row is TripRow => row !== null)
      // Newest first, then by receipt — the server's ordering, so a page
      // boundary does not reshuffle rows the user was looking at.
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.head.receipt_no ?? '').localeCompare(a.head.receipt_no ?? ''),
      );
  }, [trips]);

  const shared = {
    rows,
    loading,
    showRevenue,
    onDelete,
    onOpenReceipt,
    onOpenMap,
    onDeleteParent,
    onOpenReceiptBatch,
    emptyAction,
  };

  return isMobile ? <TripsMobileList {...shared} /> : <TripsDesktopTable {...shared} />;
}
