import type { TripMatch } from '@/entities/trip-audit/schemas';

/* -------------------------------------------------------------------------- */
/* Row severity                                                                */
/*                                                                             */
/* The server reports `critical_count` (exact per-flag severities): any        */
/* critical flag — or an unmatched trip — reads as critical; any other flag,   */
/* missed deliveries, or a ratio above 1.2 reads as warning.                   */
/* -------------------------------------------------------------------------- */

export type QueueSeverity = 'critical' | 'warning' | 'ok';

export function severityOf(m: TripMatch): QueueSeverity {
  if (m.status === 'unmatched' || m.critical_count > 0) return 'critical';
  const ratio = m.distance_ratio;
  const missedDeliveries = m.deliveries_expected > 0 && m.deliveries_visited < m.deliveries_expected;
  if (m.flag_count > 0 || missedDeliveries || (ratio != null && ratio > 1.2)) return 'warning';
  return 'ok';
}
