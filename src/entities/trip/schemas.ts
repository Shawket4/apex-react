import { z } from 'zod';

/**
 * Trip entity schemas.
 *
 * The backend returns trips in two shapes:
 *   - standalone trips (no parent_trip_id)
 *   - sub-trips / containers (parent_trip_id set, and parent_trip populated)
 *
 * Both shapes are delivered via the same list endpoints and therefore share
 * the Trip schema. Grouping into parent + containers is a UI concern.
 */

// -----------------------------------------------------------------------------
// Receipt steps (embedded in trip responses)
// -----------------------------------------------------------------------------

export const receiptStepLocationSchema = z.enum(['Garage', 'Office']);
export type ReceiptStepLocation = z.infer<typeof receiptStepLocationSchema>;

export const receiptStepSchema = z.object({
  ID: z.number().int(),
  CreatedAt: z.string().optional(),
  UpdatedAt: z.string().optional(),
  DeletedAt: z.string().nullable().optional(),

  trip_id: z.number().int(),
  location: receiptStepLocationSchema,
  received_by: z.string(),
  received_at: z.string(), // ISO timestamp
  step_order: z.number().int().optional(),
  stamped: z.boolean().default(false),
  notes: z.string().optional().default(''),
});
export type ReceiptStep = z.infer<typeof receiptStepSchema>;

// -----------------------------------------------------------------------------
// Receipt batch (attached to parent trips)
// -----------------------------------------------------------------------------

export const receiptBatchStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);
export type ReceiptBatchStatus = z.infer<typeof receiptBatchStatusSchema>;

export const receiptImageSchema = z.object({
  ID: z.number().int().optional(),
  id: z.number().int().optional(),
  image_path: z.string(),
  batch_id: z.number().int().optional(),
});
export type ReceiptImage = z.infer<typeof receiptImageSchema>;

export const receiptBatchSchema = z.object({
  // Backend is inconsistent about casing — accept both.
  ID: z.number().int().optional(),
  id: z.number().int().optional(),
  driver_id: z.number().int().optional(),
  status: receiptBatchStatusSchema,
  scanned_at: z.string().optional(),
  receipts: z.array(receiptImageSchema).optional().default([]),
  Driver: z
    .object({
      ID: z.number().int().optional(),
      id: z.number().int().optional(),
      name: z.string().optional(),
      driver_name: z.string().optional(),
    })
    .partial()
    .optional(),
});
export type ReceiptBatch = z.infer<typeof receiptBatchSchema>;

// -----------------------------------------------------------------------------
// Parent trip (multi-container group header)
// -----------------------------------------------------------------------------

export const parentTripSchema = z.object({
  ID: z.number().int(),
  CreatedAt: z.string().optional(),
  UpdatedAt: z.string().optional(),

  car_id: z.number().int(),
  driver_id: z.number().int(),
  car_no_plate: z.string(),
  driver_name: z.string(),
  transporter: z.string().default('Apex'),
  company: z.string(),
  terminal: z.string(),
  date: z.string(), // YYYY-MM-DD

  author: z.string().nullable().optional(),
  overwriter: z.string().nullable().optional(),

  receipt_batch: receiptBatchSchema.optional().nullable(),
  receipt_batch_id: z.number().int().optional().nullable(),
});
export type ParentTrip = z.infer<typeof parentTripSchema>;

// -----------------------------------------------------------------------------
// Location (embedded on some trip shapes)
// -----------------------------------------------------------------------------

export const tripLocationSchema = z.object({
  ID: z.number().int().optional(),
  Name: z.string().optional(),
  latitude: z.string().or(z.number()).optional(),
  longitude: z.string().or(z.number()).optional(),
});
export type TripLocation = z.infer<typeof tripLocationSchema>;

// -----------------------------------------------------------------------------
// Trip (standalone or sub-trip / container)
// -----------------------------------------------------------------------------

export const tripSchema = z.object({
  ID: z.number().int(),
  CreatedAt: z.string().optional(),
  UpdatedAt: z.string().optional(),
  DeletedAt: z.string().nullable().optional(),

  // Grouping
  parent_trip_id: z.number().int().nullable().optional(),
  parent_trip: parentTripSchema.nullable().optional(),

  // Vehicle / driver
  car_id: z.number().int(),
  driver_id: z.number().int(),
  car_no_plate: z.string(),
  driver_name: z.string(),
  transporter: z.string().default('Apex'),

  // Route
  company: z.string(),
  terminal: z.string(),
  drop_off_point: z.string(),
  location_name: z.string().optional().default(''),
  location: tripLocationSchema.optional(),

  // Cargo
  tank_capacity: z.number(),
  capacity: z.number().optional().default(0),
  gas_type: z.string().optional().default(''),

  // Admin
  date: z.string(), // YYYY-MM-DD
  receipt_no: z.string(),

  // Financials / distance (both `mileage` and `distance` appear — keep both)
  mileage: z.number().optional().default(0),
  distance: z.number().optional().default(0),
  revenue: z.number().optional().default(0),
  fee: z.number().optional().default(0),

  // Receipt tracking
  receipt_steps: z.array(receiptStepSchema).nullable().optional(),
});
export type Trip = z.infer<typeof tripSchema>;

// -----------------------------------------------------------------------------
// List / pagination
// -----------------------------------------------------------------------------

export const tripMetaSchema = z.object({
  page: z.number().int(),
  pages: z.number().int(),
  total: z.number().int(),
  limit: z.number().int().optional(),
});
export type TripMeta = z.infer<typeof tripMetaSchema>;

export const tripListResponseSchema = z.object({
  data: z.array(tripSchema),
  meta: tripMetaSchema.optional(),
});
export type TripListResponse = z.infer<typeof tripListResponseSchema>;

// -----------------------------------------------------------------------------
// Trip details (used by the map / location dialog)
// -----------------------------------------------------------------------------

export const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
export type LatLng = z.infer<typeof latLngSchema>;

export const routeGeometrySchema = z.object({
  geometry: z.string().nullable().optional(),
  distance: z.number().nullable().optional(),
  duration: z.number().nullable().optional(),
  coordinates: z.array(z.tuple([z.number(), z.number()])).nullable().optional(),
}).passthrough();
export type RouteGeometry = z.infer<typeof routeGeometrySchema>;

export const tripDetailsResponseSchema = z.object({
  message: z.string().optional(),
  data: tripSchema,
  drop_off_point_location: latLngSchema.nullable().optional(),
  terminal_location: latLngSchema.nullable().optional(),
  route_data: routeGeometrySchema.nullable().optional(),
});
export type TripDetailsResponse = z.infer<typeof tripDetailsResponseSchema>;

// -----------------------------------------------------------------------------
// Parent-trip / containers response (GET /api/trips/parent/:id/containers)
// -----------------------------------------------------------------------------

export const parentContainersResponseSchema = z.object({
  parent_trip: parentTripSchema,
  containers: z.array(tripSchema),
});
export type ParentContainersResponse = z.infer<typeof parentContainersResponseSchema>;

// -----------------------------------------------------------------------------
// Filters (client-side representation of query params)
// -----------------------------------------------------------------------------

export const missingDataFilterSchema = z.enum(['driver', 'route', 'any', '']);
export type MissingDataFilter = z.infer<typeof missingDataFilterSchema>;

export const receiptStatusFilterSchema = z.enum([
  'pending',
  'in_garage',
  'in_office',
  '',
]);
export type ReceiptStatusFilter = z.infer<typeof receiptStatusFilterSchema>;

export const tripFiltersSchema = z.object({
  company: z.string().default(''),
  startDate: z.string().default(''), // YYYY-MM-DD
  endDate: z.string().default(''),
  search: z.string().default(''),
  missingData: missingDataFilterSchema.default(''),
  receiptStatus: receiptStatusFilterSchema.default(''),
});
export type TripFilters = z.infer<typeof tripFiltersSchema>;

export const tripListParamsSchema = tripFiltersSchema.extend({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(10000).default(10),
});
export type TripListParams = z.infer<typeof tripListParamsSchema>;

// -----------------------------------------------------------------------------
// Create / update payloads
// -----------------------------------------------------------------------------

export const containerInputSchema = z.object({
  id: z.number().int().optional(), // set on edit
  drop_off_point: z.string().min(1),
  tank_capacity: z.number().positive(),
  gas_type: z.string().default(''),
  receipt_no: z.string().min(1),
  // Parent-level fields — included on each container for updates so the
  // backend doesn't need to re-propagate from the parent record.
  car_id: z.number().int().optional(),
  driver_id: z.number().int().optional(),
  car_no_plate: z.string().optional(),
  driver_name: z.string().optional(),
  transporter: z.string().optional(),
  company: z.string().optional(),
  terminal: z.string().optional(),
  date: z.string().optional(),
});
export type ContainerInput = z.infer<typeof containerInputSchema>;

export const parentTripInputSchema = z.object({
  car_id: z.number().int(),
  driver_id: z.number().int(), // 0 means unregistered
  car_no_plate: z.string().min(1),
  driver_name: z.string().min(1),
  transporter: z.string().default('Apex'),
  company: z.string().min(1),
  terminal: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
});
export type ParentTripInput = z.infer<typeof parentTripInputSchema>;

export const multiContainerTripInputSchema = z.object({
  parent_trip: parentTripInputSchema,
  containers: z.array(containerInputSchema).min(1).max(4),
  update_containers: z.boolean().optional(),
  receipt_batch_id: z.number().int().optional(),
  set_as_current_trip: z.boolean().optional(),
  force_create: z.boolean().optional(),
  force_update: z.boolean().optional(),
});
export type MultiContainerTripInput = z.infer<typeof multiContainerTripInputSchema>;

// -----------------------------------------------------------------------------
// Duplicate detection (409 response payload)
// -----------------------------------------------------------------------------

export const duplicateExistingTripSchema = z
  .object({
    id: z.number().int().nullable().optional(),
    car_no_plate: z.string().nullable().optional(),
    driver_name: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    terminal: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    drop_off_point: z.string().nullable().optional(),
    tank_capacity: z.number().nullable().optional(),
    gas_type: z.string().nullable().optional(),
  })
  .passthrough();
export type DuplicateExistingTrip = z.infer<typeof duplicateExistingTripSchema>;

export const duplicateRecordSchema = z.object({
  receipt_no: z.string(),
  existing_container_id: z.number().int().nullable().optional(),
  existing_parent: duplicateExistingTripSchema.nullable().optional(),
  existing_standalone: duplicateExistingTripSchema.nullable().optional(),
});
export type DuplicateRecord = z.infer<typeof duplicateRecordSchema>;

export const duplicateDetectionResponseSchema = z
  .object({
    duplicates: z.array(z.any()),
    new_data: z.any(),
  })
  .passthrough();
export type DuplicateDetectionResponse = z.infer<typeof duplicateDetectionResponseSchema>;

// -----------------------------------------------------------------------------
// Computed receipt-status helper (used by the UI)
// -----------------------------------------------------------------------------

export type ReceiptStatus =
  | { status: 'pending'; label: 'Pending'; stamped: false }
  | { status: 'in_garage'; label: 'In Garage'; stamped: boolean }
  | { status: 'in_office'; label: 'In Office'; stamped: boolean }
  | { status: 'complete'; label: 'Complete' | 'Complete & Stamped'; stamped: boolean };

export function computeReceiptStatus(trip: Pick<Trip, 'receipt_steps'>): ReceiptStatus {
  const steps = trip.receipt_steps ?? [];
  if (steps.length === 0) {
    return { status: 'pending', label: 'Pending', stamped: false };
  }

  const hasGarage = steps.some((s) => s.location === 'Garage');
  const hasOffice = steps.some((s) => s.location === 'Office');
  const stamped = steps.some((s) => s.stamped === true);

  if (hasGarage && hasOffice) {
    return {
      status: 'complete',
      label: stamped ? 'Complete & Stamped' : 'Complete',
      stamped,
    };
  }
  if (hasGarage) {
    return { status: 'in_garage', label: 'In Garage', stamped };
  }
  if (hasOffice) {
    return { status: 'in_office', label: 'In Office', stamped };
  }
  return { status: 'pending', label: 'Pending', stamped: false };
}

// -----------------------------------------------------------------------------
// Parent-grouping helper (used by the list UI)
// -----------------------------------------------------------------------------

export interface StandaloneTripItem {
  type: 'standalone';
  trip: Trip;
}
export interface ParentTripItem {
  type: 'parent';
  parentId: number;
  parentTrip: ParentTrip | null;
  containers: Trip[];
}
export type TripListItem = StandaloneTripItem | ParentTripItem;

/**
 * Groups a flat trip list into standalone rows and parent groups. Does NOT
 * sort — callers apply their own ordering (usually by date desc).
 */
export function groupTrips(trips: Trip[]): TripListItem[] {
  const grouped = new Map<number, Trip[]>();
  const standalone: Trip[] = [];

  for (const trip of trips) {
    if (trip.parent_trip_id) {
      const bucket = grouped.get(trip.parent_trip_id) ?? [];
      bucket.push(trip);
      grouped.set(trip.parent_trip_id, bucket);
    } else {
      standalone.push(trip);
    }
  }

  const items: TripListItem[] = standalone.map((trip) => ({
    type: 'standalone',
    trip,
  }));

  for (const [parentId, containers] of grouped.entries()) {
    items.push({
      type: 'parent',
      parentId,
      parentTrip: containers[0]?.parent_trip ?? null,
      containers,
    });
  }

  return items;
}