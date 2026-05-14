import { z } from 'zod';

/**
 * Cars come back from the Go backend with ID and the legacy camelCase-by-convention
 * field names the PoS side uses. We keep them as-is to avoid touching the API.
 */
export const carSchema = z.object({
  ID: z.number(),
  CreatedAt: z.string().optional().nullable(),
  UpdatedAt: z.string().optional().nullable(),
  DeletedAt: z.string().optional().nullable(),
  tablet_id: z.number().optional().nullable(),
  car_no_plate: z.string(),
  car_type: z.string().optional().nullable(),
  transporter: z.string().optional().nullable(),
  tank_capacity: z.number().optional().nullable(),
  compartments: z.array(z.number()).optional().nullable(),
  json_compartments: z.array(z.number()).optional().nullable(),
  license_expiration_date: z.string().optional().nullable(),
  calibration_expiration_date: z.string().optional().nullable(),
  tank_license_expiration_date: z.string().optional().nullable(),
  is_in_trip: z.boolean().optional().nullable(),
  is_approved: z.boolean().optional().nullable(),
  location: z.string().optional().nullable(),
  lat: z.union([z.number(), z.string()]).optional().nullable(),
  long: z.union([z.number(), z.string()]).optional().nullable(),
  location_time_stamp: z.string().optional().nullable(),
  engine_status: z.string().optional().nullable(),
  speed: z.number().optional().nullable(),
  last_fuel_odometer: z.number().optional().nullable(),
  last_oil_change_id: z.number().optional().nullable(),
  mileage: z.number().optional().nullable(),
  driver_id: z.number().optional().nullable(),
  driver: z.any().optional().nullable(),
  etit_car_id: z.string().optional().nullable(),
  operating_company: z.string().optional().nullable(),
  operating_area: z.string().optional().nullable(),
  geo_fence: z.string().optional().nullable(),
  slack_status: z.string().optional().nullable(),
  last_updated_slack_status: z.string().optional().nullable(),
  car_license_image_name: z.string().optional().nullable(),
  car_license_image_name_back: z.string().optional().nullable(),
  calibration_license_image_name: z.string().optional().nullable(),
  calibration_license_image_name_back: z.string().optional().nullable(),
  tank_license_image_name: z.string().optional().nullable(),
  tank_license_image_name_back: z.string().optional().nullable(),
  car_license_url: z.string().optional().nullable(),
  car_license_back_url: z.string().optional().nullable(),
  calibration_license_url: z.string().optional().nullable(),
  calibration_license_back_url: z.string().optional().nullable(),
  tank_license_url: z.string().optional().nullable(),
  tank_license_back_url: z.string().optional().nullable(),
});

export type Car = z.infer<typeof carSchema>;

export const carFormSchema = z.object({
  car_no_plate: z.string().min(1, 'Plate number is required'),
  car_type: z.string().min(1, 'Car type is required'),
  tank_capacity: z.number().min(0).optional().nullable(),
  license_expiration_date: z.string().min(1, 'License expiration date is required'),
  calibration_expiration_date: z.string().min(1, 'Calibration expiration date is required'),
  tank_license_expiration_date: z.string().optional().nullable(),
  compartments: z.array(z.number()).min(1, 'At least one compartment is required'),
  transporter: z.string().default('Apex'),
  driver_id: z.number().optional().nullable(),
});

export type CarFormValues = z.infer<typeof carFormSchema>;

export const carsResponseSchema = z.array(carSchema);

export const paginatedCarsResponseSchema = z.object({
  data: z.array(carSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
