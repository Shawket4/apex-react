import { apiGet, apiPost, apiPut, apiDelete } from '@/shared/api/client';
import {
  serviceInvoiceSchema,
  serviceInvoicesResponseSchema,
  searchResponseSchema,
  type ServiceInvoice,
  type ServiceInvoiceRequest,
} from './schemas';

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

export async function createServiceInvoice(invoice: ServiceInvoiceRequest): Promise<ServiceInvoice> {
  const response = await apiPost<{ data: unknown }>('/api/service-invoices', invoice);
  return serviceInvoiceSchema.parse(response.data);
}

export async function updateServiceInvoice(
  id: number | string,
  invoice: ServiceInvoiceRequest,
): Promise<ServiceInvoice> {
  const response = await apiPut<{ data: unknown }>(`/api/service-invoices/${id}`, invoice);
  return serviceInvoiceSchema.parse(response.data);
}

export async function deleteServiceInvoice(id: number | string): Promise<void> {
  await apiDelete(`/api/service-invoices/${id}`);
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
