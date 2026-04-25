import { z } from 'zod';

/**
 * Cars come back from the Go backend with ID and the legacy camelCase-by-convention
 * field names the PoS side uses. We keep them as-is to avoid touching the API.
 */
export const carSchema = z.object({
  ID: z.number(),
  car_no_plate: z.string(),
  driver_id: z.number().optional().nullable(),
  last_fuel_odometer: z.number().optional().nullable(),
  // Trip module: capacity validation + dropdown subtitle
  tank_capacity: z.number().optional().nullable(),
  car_type: z.string().optional().nullable(),
});

export type Car = z.infer<typeof carSchema>;

export const carsResponseSchema = z.array(carSchema);
