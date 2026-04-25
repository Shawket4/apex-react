import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { mappingApi } from './api';
import type {
  CompaniesResponse,
  DropOffsResponse,
  TerminalsResponse,
} from './schemas';

/**
 * Mappings are config data — they change at most a handful of times per day,
 * so we cache aggressively.
 */
const MAPPING_STALE_TIME = 5 * 60_000;

export const mappingKeys = {
  all: ['mappings'] as const,
  companies: () => [...mappingKeys.all, 'companies'] as const,
  terminals: (company: string) => [...mappingKeys.all, 'terminals', company] as const,
  dropOffs: (company: string, terminal: string) =>
    [...mappingKeys.all, 'dropoffs', company, terminal] as const,
};

export function useCompanies(
  options?: Partial<UseQueryOptions<CompaniesResponse>>,
) {
  return useQuery({
    queryKey: mappingKeys.companies(),
    queryFn: () => mappingApi.companies(),
    staleTime: MAPPING_STALE_TIME,
    ...options,
  });
}

export function useTerminals(
  company: string,
  options?: Partial<UseQueryOptions<TerminalsResponse>>,
) {
  return useQuery({
    queryKey: mappingKeys.terminals(company),
    queryFn: () => mappingApi.terminals(company),
    enabled: !!company,
    staleTime: MAPPING_STALE_TIME,
    ...options,
  });
}

export function useDropOffs(
  company: string,
  terminal: string,
  options?: Partial<UseQueryOptions<DropOffsResponse>>,
) {
  return useQuery({
    queryKey: mappingKeys.dropOffs(company, terminal),
    queryFn: () => mappingApi.dropOffs(company, terminal),
    enabled: !!company && !!terminal,
    staleTime: MAPPING_STALE_TIME,
    ...options,
  });
}
