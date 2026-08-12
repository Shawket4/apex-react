import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getMessage, getMessages } from './api';
import type { MessageFilters } from './schemas';
import { QUERY_KEYS } from '@/shared/config/constants';

/** Messages fetched per request. The API caps a page at 200, defaults to 50. */
const PAGE_SIZE = 50;

/* ─── List (cursor-paged; replaces the old hard 100-row cap) ─── */
export function useMessagesPaged(filters: MessageFilters) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.messageList(filters),
    queryFn: ({ pageParam }) =>
      getMessages(filters, pageParam as string | undefined, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
  });
}

/* ─── Single ─── */
export function useMessage(id: number | undefined) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.message(id) : ['messages', 'none'],
    queryFn: () => getMessage(id!),
    enabled: !!id,
  });
}
