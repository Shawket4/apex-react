import { z } from 'zod';
import { carSchema } from '../car/schemas';

export const paginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type PaginationMetadata = z.infer<typeof paginationSchema>;

export const inspectionItemSchema = z.preprocess((val: any) => {
  if (val && typeof val === 'object' && 'id' in val && !('ID' in val)) {
    return { ...val, ID: val.id };
  }
  return val;
}, z.object({
  ID: z.number().optional(),
  service: z.string(),
  notes: z.string().optional().default(''),
  item_order: z.number(),
  matched: z.boolean().optional(),
  match_type: z.enum(['semantic', 'keyword', 'both']).optional(),
  distance: z.number().optional(),
}));

export type InspectionItem = z.infer<typeof inspectionItemSchema>;

export const serviceInvoiceSchema = z.preprocess((val: any) => {
  if (val && typeof val === 'object') {
    const next = { ...val };
    if ('id' in next && !('ID' in next)) next.ID = next.id;
    if (next.car && typeof next.car === 'object') {
      if ('id' in next.car && !('ID' in next.car)) next.car.ID = next.car.id;
      if ('plate_number' in next.car && !('car_no_plate' in next.car)) {
        next.car.car_no_plate = next.car.plate_number;
      }
    }
    return next;
  }
  return val;
}, z.object({
  ID: z.number(),
  car_id: z.number().optional(), // Make optional as it might be missing in search results
  plate_number: z.string(),
  driver_id: z.number().optional().nullable(),
  driver_name: z.string(),
  date: z.string(),
  meter_reading: z.number(),
  supervisor: z.string(),
  operating_region: z.string(),
  car: carSchema.optional(),
  inspection_items: z.array(inspectionItemSchema).optional().default([]),
  match_count: z.number().optional(),
}));

export type ServiceInvoice = z.infer<typeof serviceInvoiceSchema>;

export const serviceInvoiceRequestSchema = z.object({
  car_id: z.number(),
  driver_id: z.number().optional().nullable(),
  driver_name: z.string().min(1, 'Driver name is required'),
  date: z.string().min(1, 'Date is required'),
  meter_reading: z.number().min(0, 'Meter reading must be positive'),
  plate_number: z.string().min(1, 'Plate number is required'),
  supervisor: z.string().min(1, 'Supervisor is required'),
  operating_region: z.string().min(1, 'Operating region is required'),
  inspection_items: z.array(
    z.object({
      service: z.string(),
      notes: z.string().optional().default(''),
    }),
  ),
});

export type ServiceInvoiceRequest = z.infer<typeof serviceInvoiceRequestSchema>;

export const serviceInvoiceFormSchema = serviceInvoiceRequestSchema;
export type ServiceInvoiceFormValues = z.infer<typeof serviceInvoiceFormSchema>;

export const serviceInvoicesResponseSchema = z.object({
  data: z.array(serviceInvoiceSchema),
  pagination: paginationSchema,
});

export const serviceCarsResponseSchema = z.object({
  data: z.array(carSchema),
  pagination: paginationSchema,
});

export const searchResponseSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  total_matches: z.number(),
  invoice_count: z.number(),
  results: z.array(serviceInvoiceSchema),
  search_time: z.string(),
  pagination: paginationSchema.optional(),
});
