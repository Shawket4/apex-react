import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/shared/config/constants';
import * as api from './api';
import type { ServiceInvoiceRequest } from './schemas';

export function useServiceInvoices(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...QUERY_KEYS.serviceInvoices, { page, limit }],
    queryFn: () => api.getServiceInvoices(page, limit),
  });
}

export function useServiceInvoice(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.serviceInvoice(id!),
    queryFn: () => api.getServiceInvoice(id!),
    enabled: !!id,
  });
}

export function useCreateServiceInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createServiceInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.serviceInvoices });
    },
  });
}

export function useUpdateServiceInvoice(id: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoice: ServiceInvoiceRequest) => api.updateServiceInvoice(id, invoice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.serviceInvoices });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.serviceInvoice(id) });
    },
  });
}

export function useDeleteServiceInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteServiceInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.serviceInvoices });
    },
  });
}

export function useSearchServiceInvoices(query: string, plateNumber?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.serviceInvoices, 'search', { query, plateNumber }],
    queryFn: () => api.searchServiceInvoices(query, plateNumber),
    enabled: query.length > 0,
    staleTime: 0, // Search results should be fresh
  });
}
