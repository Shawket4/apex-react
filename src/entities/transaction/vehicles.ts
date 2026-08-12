import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClientRust } from '@/shared/api/client';
import { QUERY_KEYS } from '@/shared/config/constants';

/**
 * Vehicles for the transaction form.
 *
 * Selected by id, not by typing a plate. `ف ج م 8567` and `ف ج م  8567` are one
 * vehicle to a human and two to a report -- the same reason the party picker
 * stores ids.
 */
export const vehicleSchema = z.object({
  id: z.number(),
  car_no_plate: z.string(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export function useVehicles() {
  return useQuery({
    queryKey: QUERY_KEYS.vehicles,
    queryFn: async () => {
      const res = await apiClientRust.get('/api/v1/vehicles');
      return z.array(vehicleSchema).parse(res.data ?? []);
    },
    staleTime: 5 * 60_000,
  });
}
