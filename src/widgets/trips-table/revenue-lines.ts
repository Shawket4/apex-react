import type { TFunction } from 'i18next';

import type { Trip } from '@/entities/trip/schemas';
import { formatNumber } from '@/shared/lib/format';

/* -------------------------------------------------------------------------- */
/* What a trip earned, and what it was charged on                              */
/*                                                                            */
/* One module because the table and the mobile list must never disagree about  */
/* a figure. Both render this; neither owns it.                                */
/* -------------------------------------------------------------------------- */

/** Companies billed on distance rather than volume. */
const DISTANCE_BILLED = new Set(['TAQA', 'Petromin']);

/**
 * Sum a revenue field across containers, preserving "not permitted".
 *
 * Undefined when no container carries the field — which is what a caller below
 * permission 4 receives, and must not become a confident zero.
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

/**
 * What one container was charged on.
 *
 * `fee` means a different thing per company, which is why this cannot be a
 * single format string: a rate per 1,000 L for Petrol Arrows, a BAND NUMBER
 * from 1 to 15 for Watanya, and nothing at all for TAQA and Petromin, which
 * bill on distance. The rates themselves are deliberately not restated here —
 * they live in the backend's revenue module, and duplicating them on the
 * client is exactly how Go and Rust came to bill TAQA differently.
 */
export interface ChargeLine {
  key: string;
  /** e.g. "39,000 L · band 1", or "211 km" for the distance-billed companies. */
  label: string;
  /** Summed base revenue for the containers on this rate. */
  revenue?: number;
  /** How many containers collapsed into this line. */
  count: number;
}

/**
 * Containers on the SAME rate collapse into one line with volumes summed.
 *
 * A trip dropping 13,000 L and 26,000 L at the same band was charged on
 * 39,000 L at that band. Listing that as two identical-rate lines describes the
 * paperwork rather than the charge, and makes a three-drop trip look like three
 * different prices.
 */
export function chargeLines(containers: Trip[], t: TFunction): ChargeLine[] {
  const groups = new Map<
    string,
    { company: string; fee: number; litres: number; km: number; revenue?: number; count: number }
  >();

  for (const c of containers) {
    const fee = c.fee ?? 0;
    const key = `${c.company}|${fee}`;
    const g = groups.get(key) ?? { company: c.company, fee, litres: 0, km: 0, count: 0 };
    g.litres += c.tank_capacity || 0;
    g.km += c.mileage || c.distance || 0;
    g.count += 1;
    if (c.revenue != null) g.revenue = (g.revenue ?? 0) + c.revenue;
    groups.set(key, g);
  }

  return [...groups.entries()].map(([key, g]) => ({
    key,
    label: DISTANCE_BILLED.has(g.company)
      ? `${formatNumber(g.km, 0)} km`
      : g.company === 'Watanya'
        ? t('trips.revenue.atBand', { volume: formatNumber(g.litres, 0), band: g.fee })
        : t('trips.revenue.atRate', {
            volume: formatNumber(g.litres, 0),
            rate: formatNumber(g.fee, 2),
          }),
    revenue: g.revenue,
    count: g.count,
  }));
}
