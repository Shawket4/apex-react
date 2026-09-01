import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { UnauthorizedError, reportServerFault } from './errors';

/**
 * The name of the thing being fetched, and nothing else.
 *
 * A query key's later elements are the filters — dates, ids, search terms,
 * sometimes a driver's name typed into a box. The first element is the entity
 * ("trips", "fuelEvents"), which is what makes the event findable without
 * carrying any of that to Sentry.
 */
function entityOf(key: readonly unknown[]): string | undefined {
  const head = key[0];
  return typeof head === 'string' ? head : undefined;
}

export const queryClient = new QueryClient({
  /**
   * Every query failure passes here once, whatever the hook does with it
   * afterwards.
   *
   * Twenty-seven onError handlers console.error and show a toast, and none of
   * them reported: a caught error never reaches the SDK's global handler, so
   * Sentry heard nothing while the user saw a red toast. Adding a
   * captureException to each is a list that drifts the moment someone writes
   * the twenty-eighth. This is the one funnel, and reportServerFault
   * deduplicates, so a hook that also calls extractErrorMessage does not raise
   * the same failure twice.
   */
  queryCache: new QueryCache({
    onError: (error, query) => {
      reportServerFault(error, 'query', entityOf(query.queryKey));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      reportServerFault(error, 'mutation', entityOf(mutation.options.mutationKey ?? []));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof UnauthorizedError) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
