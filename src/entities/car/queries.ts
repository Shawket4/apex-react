import { useQuery } from '@tanstack/react-query';
import { getCars } from './api';
import { QUERY_KEYS } from '@/shared/config/constants';

export function useCars() {
  return useQuery({
    queryKey: QUERY_KEYS.cars,
    queryFn: getCars,
    staleTime: 5 * 60_000,
  });
}
