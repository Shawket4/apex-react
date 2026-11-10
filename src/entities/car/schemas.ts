import { z } from 'zod';
import i18n from '@/shared/i18n';

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
  // What the licence says about the vehicle itself.
  chassis_no: z.string().optional().nullable(),
  engine_no: z.string().optional().nullable(),
  engine_cc: z.number().optional().nullable(),
  payload_tons: z.number().optional().nullable(),
  color: z.string().optional().nullable(),
  // A trailer stays with its truck, so its own plate, chassis, payload and
  // colour are fields of the car. Only meaningful when car_type is "Trailer".
  trailer_no_plate: z.string().optional().nullable(),
  trailer_chassis_no: z.string().optional().nullable(),
  trailer_payload_tons: z.number().optional().nullable(),
  trailer_color: z.string().optional().nullable(),
});

export type Car = z.infer<typeof carSchema>;

/** The vehicle kinds FalconGo knows. The stored value is the English name. */
export const CAR_TYPES = ['No Trailer', 'Trailer', 'Truck'] as const;
/** The kind that pulls a trailer, and so has the trailer's fields. */
export const TRAILER_CAR_TYPE = 'Trailer';

/**
 * A number typed into a field, kept as text so an empty field stays empty
 * instead of turning into a 0 the user never wrote.
 */
const optionalAmount = (wholeOnly: boolean) =>
  z.string().refine(
    (value) => {
      if (value.trim() === '') return true;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 && (!wholeOnly || Number.isInteger(n));
    },
    () => ({ message: i18n.t('validation.nonNegative') }),
  );

/**
 * The add / edit form. Only the plate is required: every other field is
 * something a licence may or may not say, and the papers themselves (and
 * their dates) are documents, not fields of the car.
 */
export const carFormSchema = z.object({
  car_no_plate: z
    .string()
    .refine((value) => value.trim().length > 0, () => ({
      message: i18n.t('cars.validation.plateRequired'),
    })),
  car_type: z.string(),
  /** 0 is "no driver". */
  driver_id: z.number(),
  /** Tank sections in litres. A row left empty is not a section. */
  compartments: z.array(z.object({ litres: optionalAmount(true) })),
  chassis_no: z.string(),
  engine_no: z.string(),
  engine_cc: optionalAmount(true),
  payload_tons: optionalAmount(false),
  color: z.string(),
  trailer_no_plate: z.string(),
  trailer_chassis_no: z.string(),
  trailer_payload_tons: optionalAmount(false),
  trailer_color: z.string(),
});

export type CarFormValues = z.infer<typeof carFormSchema>;

/** A new car starts with this many empty tank sections to fill in. */
const NEW_CAR_COMPARTMENTS = 4;

function text(value: string | null | undefined): string {
  return value ?? '';
}

/** A stored amount as the form shows it: nothing recorded is an empty field. */
function amountText(value: number | null | undefined): string {
  return value ? String(value) : '';
}

/** The stored tank layout of a car, in litres. */
export function carCompartments(car: Car): number[] {
  if (car.json_compartments?.length) return car.json_compartments;
  return car.compartments ?? [];
}

/** What the form opens with: the car being edited, or a blank new one. */
export function carFormDefaults(car?: Car | null): CarFormValues {
  const compartments = car
    ? carCompartments(car).map((litres) => ({ litres: amountText(litres) }))
    : Array.from({ length: NEW_CAR_COMPARTMENTS }, () => ({ litres: '' }));
  return {
    car_no_plate: text(car?.car_no_plate),
    car_type: car?.car_type || CAR_TYPES[0],
    driver_id: car?.driver_id ?? 0,
    compartments,
    chassis_no: text(car?.chassis_no),
    engine_no: text(car?.engine_no),
    engine_cc: amountText(car?.engine_cc),
    payload_tons: amountText(car?.payload_tons),
    color: text(car?.color),
    trailer_no_plate: text(car?.trailer_no_plate),
    trailer_chassis_no: text(car?.trailer_chassis_no),
    trailer_payload_tons: amountText(car?.trailer_payload_tons),
    trailer_color: text(car?.trailer_color),
  };
}

/** What a car save sends. A field left out is left as it is on the server. */
export interface CarPayload {
  car_no_plate: string;
  car_type: string;
  /** The compartments' total. Left out when none are given: see carPayload. */
  tank_capacity?: number;
  compartments: number[];
  chassis_no: string;
  engine_no: string;
  engine_cc: number;
  payload_tons: number;
  color: string;
  trailer_no_plate?: string;
  trailer_chassis_no?: string;
  trailer_payload_tons?: number;
  trailer_color?: string;
}

function amount(value: string): number {
  const n = Number(value);
  return value.trim() === '' || !Number.isFinite(n) ? 0 : n;
}

/**
 * The form as the API takes it.
 *
 * Empty compartments are dropped: a tank section of no litres is not a
 * section. The capacity is the compartments' total, and is only sent when
 * there are compartments, so a car recorded with a capacity and no layout
 * keeps its capacity when something else about it is edited. The trailer's
 * fields are only sent for a vehicle that has one, so changing a car's type
 * never erases what was recorded about its trailer.
 */
export function carPayload(values: CarFormValues): CarPayload {
  const compartments = values.compartments
    .map((row) => amount(row.litres))
    .filter((litres) => litres > 0);
  const payload: CarPayload = {
    car_no_plate: values.car_no_plate.trim(),
    car_type: values.car_type,
    compartments,
    chassis_no: values.chassis_no.trim(),
    engine_no: values.engine_no.trim(),
    engine_cc: amount(values.engine_cc),
    payload_tons: amount(values.payload_tons),
    color: values.color.trim(),
  };
  if (compartments.length > 0) {
    payload.tank_capacity = compartments.reduce((sum, litres) => sum + litres, 0);
  }
  if (values.car_type === TRAILER_CAR_TYPE) {
    payload.trailer_no_plate = values.trailer_no_plate.trim();
    payload.trailer_chassis_no = values.trailer_chassis_no.trim();
    payload.trailer_payload_tons = amount(values.trailer_payload_tons);
    payload.trailer_color = values.trailer_color.trim();
  }
  return payload;
}

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
