import { apiGet } from '@/shared/api/client';
import {
  serviceInvoiceSchema,
  serviceInvoicesResponseSchema,
  searchResponseSchema,
  type ServiceInvoice,
} from './schemas';

/* Old service invoices are history: read and search only. New work is a work
 * order in the garage system (see entities/maintenance). */

export async function getServiceInvoices(carId?: number | string, page = 1, limit = 10) {
  const params = new URLSearchParams({ 
    page: String(page), 
    limit: String(limit) 
  });
  if (carId) params.append('car_id', String(carId));
  
  const data = await apiGet(`/api/service-invoices?${params.toString()}`);
  return serviceInvoicesResponseSchema.parse(data);
}


export async function getServiceInvoice(id: number | string): Promise<ServiceInvoice> {
  const response = await apiGet<{ data: unknown }>(`/api/service-invoices/${id}`);
  return serviceInvoiceSchema.parse(response.data);
}

export async function searchServiceInvoices(query: string, carId?: number | string, page = 1, limit = 10) {
  const params = new URLSearchParams({ 
    query,
    page: String(page),
    limit: String(limit)
  });
  if (carId) params.append('car_id', String(carId));
  
  const data = await apiGet(`/api/service-invoices/search?${params.toString()}`);
  return searchResponseSchema.parse(data);
}
