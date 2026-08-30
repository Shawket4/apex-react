import { statusGroup, type LiveStatus, type StatusGroup, type Vehicle } from '../schemas';

export function groupOf(vehicle: Vehicle, live: LiveStatus | null): StatusGroup {
  return statusGroup(live?.status ?? vehicle.status);
}
