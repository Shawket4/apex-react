import { z } from 'zod';

/**
 * Trip summary powers the route-visualization view. It compares the actual
 * GPS-recorded path against the OSRM-optimal path, broken down into legs:
 *
 *   Terminal → Stop 1 → Stop 2 → ... → Return (optional)
 *
 * The backend keeps the actual and optimal legs as separate arrays, each with
 * its own geometry, so the UI can toggle between views.
 *
 * Note: the Go struct uses PascalCase field names in JSON output here, unlike
 * most of the rest of the app. Schemas reflect that.
 */

// -----------------------------------------------------------------------------
// GPS ping
// -----------------------------------------------------------------------------

export const locationPingSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  time_stamp: z.string().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
}).passthrough();
export type LocationPing = z.infer<typeof locationPingSchema>;

// -----------------------------------------------------------------------------
// Leg (shared between actual and optimal)
// -----------------------------------------------------------------------------

export const tripLegSchema = z.object({
  id: z.number().int(),
  sequence_number: z.number().int(),

  // Delivery legs have a trip_struct_id; the return leg does not.
  trip_struct_id: z.number().int().nullable().optional(),
  container_ids: z.string().optional(), // JSON-encoded int array

  from_name: z.string().optional(),
  to_name: z.string().optional(),

  from_location_lat: z.number().optional(),
  from_location_lng: z.number().optional(),
  to_location_lat: z.number().optional(),
  to_location_lng: z.number().optional(),

  // Distances in km
  actual_distance: z.number().optional().default(0),
  osrm_distance: z.number().optional().default(0),

  // Durations in seconds
  travel_duration: z.number().optional().default(0),
  dwell_time: z.number().optional().default(0),

  // Speeds in km/h
  average_speed: z.number().optional().default(0),
  max_speed: z.number().optional().default(0),

  // Timestamps
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),

  // Optional per-leg geometry (encoded polyline — OSRM format)
  osrm_geometry: z.string().optional(),

  // Per-leg pings (preferred over top-level pings when populated)
  location_pings: z.array(locationPingSchema).optional().default([]),
}).passthrough();
export type TripLeg = z.infer<typeof tripLegSchema>;

// -----------------------------------------------------------------------------
// Parent-trip reference embedded in the summary
// -----------------------------------------------------------------------------

export const tripSummaryParentSchema = z.object({
  company: z.string().optional(),
  terminal: z.string().optional(),
  car_no_plate: z.string().optional(),
  driver_name: z.string().optional(),
  date: z.string().optional(),
}).passthrough();
export type TripSummaryParent = z.infer<typeof tripSummaryParentSchema>;

// -----------------------------------------------------------------------------
// Summary body
// -----------------------------------------------------------------------------

export const tripSummarySchema = z.object({
  ParentTripID: z.number().int(),
  ParentTrip: tripSummaryParentSchema.optional(),

  // Journey bounds
  StartTime: z.string(),
  EndTime: z.string(),
  ReturnTime: z.string().optional(),
  TripDuration: z.number().default(0), // seconds

  StartLocationLat: z.number().optional(),
  StartLocationLng: z.number().optional(),
  EndLocationLat: z.number().optional(),
  EndLocationLng: z.number().optional(),

  // Distance comparison (km)
  ActualDistance: z.number().default(0),
  OSRMDistance: z.number().default(0),
  DistanceDeviation: z.number().default(0),

  // Time comparison (seconds)
  TimeDeviation: z.number().default(0),

  // Derived metrics
  AverageSpeed: z.number().default(0),
  RouteEfficiency: z.number().default(0), // percent

  TotalDeliveries: z.number().int().default(0),
  ReturnedToBase: z.boolean().default(false),
  IsComplete: z.boolean().default(false),

  // Top-level optimal-route geometry (encoded polyline)
  osrm_geometry: z.string().optional(),

  // Leg collections
  ActualLegs: z.array(tripLegSchema).optional().default([]),
  OptimalLegs: z.array(tripLegSchema).optional().default([]),

  // Fallback ping stream when legs don't carry their own pings
  location_pings: z.array(locationPingSchema).optional().default([]),
}).passthrough();
export type TripSummary = z.infer<typeof tripSummarySchema>;

// -----------------------------------------------------------------------------
// Response envelope (backend returns { success, data, message?, hint? })
// -----------------------------------------------------------------------------

export const tripSummaryResponseSchema = z.object({
  success: z.boolean(),
  data: tripSummarySchema.optional(),
  message: z.string().optional(),
  hint: z.string().optional(),
});
export type TripSummaryResponse = z.infer<typeof tripSummaryResponseSchema>;
