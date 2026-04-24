import { FUEL_EFFICIENCY } from '@/shared/config/constants';
import type { FuelEvent } from '@/entities/fuel-event/schemas';

export type EfficiencyStatus = 'excluded' | 'poor' | 'average' | 'good';

export interface EfficiencyResult {
  status: EfficiencyStatus;
  isValid: boolean;
  className: string;
  bgClassName: string;
  icon: string;
  labelKey: string;
}

/**
 * Evaluates a fuel efficiency rate (km/L) against the business thresholds
 * used across the dashboard. Centralised to avoid drift between components.
 *
 * Used for single-event evaluation (live form preview, detail page).
 * For list-level analysis use `analyseEvents` below which also does the
 * two-event pairing rescue.
 */
export function evaluateEfficiency(rate: number | string): EfficiencyResult {
  const r = typeof rate === 'string' ? parseFloat(rate) : rate;

  if (!Number.isFinite(r) || r < FUEL_EFFICIENCY.MIN_VALID || r > FUEL_EFFICIENCY.MAX_VALID) {
    return {
      status: 'excluded',
      isValid: false,
      className: 'text-muted-foreground',
      bgClassName: 'bg-muted',
      icon: '⚠️',
      labelKey: 'fuelEvents.efficiency.excluded',
    };
  }
  if (r < FUEL_EFFICIENCY.POOR_THRESHOLD) {
    return {
      status: 'poor',
      isValid: true,
      className: 'text-destructive',
      bgClassName: 'bg-destructive/10',
      icon: '😟',
      labelKey: 'fuelEvents.efficiency.poor',
    };
  }
  if (r < FUEL_EFFICIENCY.AVERAGE_THRESHOLD) {
    return {
      status: 'average',
      isValid: true,
      className: 'text-warning',
      bgClassName: 'bg-warning/10',
      icon: '😐',
      labelKey: 'fuelEvents.efficiency.average',
    };
  }
  return {
    status: 'good',
    isValid: true,
    className: 'text-success',
    bgClassName: 'bg-success/10',
    icon: '😊',
    labelKey: 'fuelEvents.efficiency.good',
  };
}

/* -------------------------------------------------------------------------- */
/* Calculators used by the live form preview                                  */
/* -------------------------------------------------------------------------- */

export function calculateFuelRate(
  liters: number | string,
  odometerBefore: number | string,
  odometerAfter: number | string,
): number {
  const l = typeof liters === 'string' ? parseFloat(liters) : liters;
  const before = typeof odometerBefore === 'string' ? parseFloat(odometerBefore) : odometerBefore;
  const after = typeof odometerAfter === 'string' ? parseFloat(odometerAfter) : odometerAfter;
  if (!Number.isFinite(l) || l <= 0) return 0;
  const distance = Math.max(0, after - before);
  return distance / l;
}

export function calculateDistance(
  odometerBefore: number | string,
  odometerAfter: number | string,
): number {
  const before = typeof odometerBefore === 'string' ? parseFloat(odometerBefore) : odometerBefore;
  const after = typeof odometerAfter === 'string' ? parseFloat(odometerAfter) : odometerAfter;
  return Math.max(0, (after || 0) - (before || 0));
}

export function calculateTotalPrice(
  liters: number | string,
  pricePerLiter: number | string,
): number {
  const l = typeof liters === 'string' ? parseFloat(liters) : liters;
  const p = typeof pricePerLiter === 'string' ? parseFloat(pricePerLiter) : pricePerLiter;
  if (!Number.isFinite(l) || !Number.isFinite(p)) return 0;
  return l * p;
}

/* -------------------------------------------------------------------------- */
/* Pair-aware list analysis                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Per-event analysis result. Attached to each event by `analyseEvents`.
 *
 * The pairing logic:
 *   If an event has a fuel rate outside the valid band, we look at the
 *   previous chronological event for the SAME vehicle. We then compute a
 *   combined rate as (distance_end - distance_start_prev) / (liters_prev + liters).
 *   If that combined rate sits in the valid band, we treat the two events as
 *   one logical fuel-up — both get `pairedWith` set to the other's ID and
 *   contribute to averages as a single combined measurement.
 *
 * Partial fills in the real world (tank not topped up, driver leaves halfway,
 * gauge misreads) produce this pattern: one event undershoots, the next
 * overshoots. Combining them recovers the true efficiency.
 */
export interface AnalysedEfficiency {
  /** Display status for this event — may be 'paired' even though the raw rate is excluded */
  status: EfficiencyStatus | 'paired';
  /** Whether this event (or its pair) contributes to averages */
  isValid: boolean;
  /** The event ID this one is paired with, if any */
  pairedWith?: number;
  /** The partner event's raw (standalone) rate — only set when paired */
  partnerRate?: number;
  /** The partner event's ISO date string — only set when paired */
  partnerDate?: string;
  /** Combined rate when paired (otherwise equals the event's own rate) */
  effectiveRate: number;
  /** Combined liters for the pair — used by list stats to avoid double-counting */
  contributionLiters: number;
  /** Combined distance for the pair — used by list stats to avoid double-counting */
  contributionDistance: number;
  /** Tailwind classes for text colour, matching `evaluateEfficiency` conventions */
  className: string;
  bgClassName: string;
  icon: string;
  labelKey: string;
}

/** Lookup keyed by event ID */
export type EfficiencyMap = Map<number, AnalysedEfficiency>;

function statusForRate(r: number): EfficiencyStatus {
  if (!Number.isFinite(r) || r < FUEL_EFFICIENCY.MIN_VALID || r > FUEL_EFFICIENCY.MAX_VALID)
    return 'excluded';
  if (r < FUEL_EFFICIENCY.POOR_THRESHOLD) return 'poor';
  if (r < FUEL_EFFICIENCY.AVERAGE_THRESHOLD) return 'average';
  return 'good';
}

function stylesFor(status: EfficiencyStatus | 'paired'): Pick<
  AnalysedEfficiency,
  'className' | 'bgClassName' | 'icon' | 'labelKey'
> {
  switch (status) {
    case 'good':
      return {
        className: 'text-success',
        bgClassName: 'bg-success/10',
        icon: '😊',
        labelKey: 'fuelEvents.efficiency.good',
      };
    case 'average':
      return {
        className: 'text-warning',
        bgClassName: 'bg-warning/10',
        icon: '😐',
        labelKey: 'fuelEvents.efficiency.average',
      };
    case 'poor':
      return {
        className: 'text-destructive',
        bgClassName: 'bg-destructive/10',
        icon: '😟',
        labelKey: 'fuelEvents.efficiency.poor',
      };
    case 'paired':
      return {
        className: 'text-primary',
        bgClassName: 'bg-primary/10',
        icon: '🔗',
        labelKey: 'fuelEvents.efficiency.paired',
      };
    case 'excluded':
    default:
      return {
        className: 'text-muted-foreground',
        bgClassName: 'bg-muted',
        icon: '⚠️',
        labelKey: 'fuelEvents.efficiency.excluded',
      };
  }
}

/**
 * Analyse a list of events and return a per-event map plus aggregate stats.
 *
 * The list is processed per-vehicle, sorted ascending by date. Each event is
 * checked standalone first; if excluded, we try rescuing it by pairing with
 * the IMMEDIATELY PREVIOUS event for the same vehicle (provided that previous
 * event isn't already paired). If the combined rate is valid, both events are
 * marked as `paired` and contribute to averages as one measurement.
 *
 * Aggregate `validLiters` and `validDistance` never double-count paired
 * events — only the later event in a pair carries the combined contribution.
 */
export function analyseEvents(events: FuelEvent[]): {
  map: EfficiencyMap;
  totals: {
    totalLiters: number;
    totalCost: number;
    totalEvents: number;
    validLiters: number;
    validDistance: number;
    avgRate: number;
    pairedCount: number;
  };
} {
  const map: EfficiencyMap = new Map();

  // Group by vehicle plate
  const byPlate = new Map<string, FuelEvent[]>();
  for (const e of events) {
    (byPlate.get(e.car_no_plate) ?? byPlate.set(e.car_no_plate, []).get(e.car_no_plate)!).push(e);
  }

  // IDs of events we've already consumed as the "prev" half of a pair.
  // Once an event is paired, it can't be paired again with the next one.
  const consumedIds = new Set<number>();

  for (const [, list] of byPlate) {
    // Sort ascending by date (then by ID as tiebreaker for same-day entries)
    list.sort((a, b) => {
      const diff = a.date.localeCompare(b.date);
      return diff !== 0 ? diff : a.ID - b.ID;
    });

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const ownStatus = statusForRate(e.fuel_rate);
      const ownDistance = Math.max(0, e.odometer_after - e.odometer_before);

      if (ownStatus !== 'excluded') {
        // Already valid on its own — no pairing needed
        map.set(e.ID, {
          status: ownStatus,
          isValid: true,
          effectiveRate: e.fuel_rate,
          contributionLiters: e.liters,
          contributionDistance: ownDistance,
          ...stylesFor(ownStatus),
        });
        continue;
      }

      // Excluded on its own — try to pair with the previous event for this vehicle
      const prev = i > 0 ? list[i - 1] : undefined;
      if (prev && !consumedIds.has(prev.ID)) {
        const combinedLiters = prev.liters + e.liters;
        const combinedDistance = Math.max(0, e.odometer_after - prev.odometer_before);
        const combinedRate = combinedLiters > 0 ? combinedDistance / combinedLiters : 0;
        const combinedStatus = statusForRate(combinedRate);

        if (combinedStatus !== 'excluded') {
          // Rescued by pairing. Both events flagged as paired; only the later
          // event carries the combined contribution to avoid double-counting.
          //
          // Each half also records its partner's standalone rate and date so
          // the UI can surface that context in a tooltip — useful for users
          // who want to understand why the pair was needed.
          consumedIds.add(prev.ID);

          const prevPrevious = map.get(prev.ID);
          map.set(prev.ID, {
            ...(prevPrevious ?? {
              status: 'paired',
              isValid: true,
              effectiveRate: combinedRate,
              contributionLiters: 0,
              contributionDistance: 0,
              ...stylesFor('paired'),
            }),
            status: 'paired',
            isValid: true,
            pairedWith: e.ID,
            partnerRate: e.fuel_rate,
            partnerDate: e.date,
            effectiveRate: combinedRate,
            // Contribution zeroed on the earlier half — the later half owns it
            contributionLiters: 0,
            contributionDistance: 0,
            ...stylesFor('paired'),
          });

          map.set(e.ID, {
            status: 'paired',
            isValid: true,
            pairedWith: prev.ID,
            partnerRate: prev.fuel_rate,
            partnerDate: prev.date,
            effectiveRate: combinedRate,
            contributionLiters: combinedLiters,
            contributionDistance: combinedDistance,
            ...stylesFor('paired'),
          });
          continue;
        }
      }

      // Could not rescue — genuinely excluded
      map.set(e.ID, {
        status: 'excluded',
        isValid: false,
        effectiveRate: e.fuel_rate,
        contributionLiters: 0,
        contributionDistance: 0,
        ...stylesFor('excluded'),
      });
    }
  }

  // Aggregate totals
  let totalLiters = 0;
  let totalCost = 0;
  let validLiters = 0;
  let validDistance = 0;
  let pairedCount = 0;

  for (const e of events) {
    totalLiters += e.liters;
    totalCost += e.price;
    const a = map.get(e.ID);
    if (!a) continue;
    if (a.status === 'paired') pairedCount++;
    if (a.isValid) {
      validLiters += a.contributionLiters;
      validDistance += a.contributionDistance;
    }
  }

  const avgRate = validLiters > 0 ? validDistance / validLiters : 0;

  return {
    map,
    totals: {
      totalLiters,
      totalCost,
      totalEvents: events.length,
      validLiters,
      validDistance,
      avgRate,
      pairedCount,
    },
  };
}