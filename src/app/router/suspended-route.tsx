import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Skeleton } from '@/shared/ui/skeleton';

/* -------------------------------------------------------------------------- */
/* Suspense fallback                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight skeleton shown while a route chunk is being fetched. Uses
 * the same outer frame as the dashboard (the design reference: max-w-6xl,
 * gap-3, p-3 sm:p-4) so the layout doesn't reflow when the real page mounts.
 */
function PageLoadingFallback() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded-sm" />
          <Skeleton className="h-3.5 w-64 rounded-sm" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

/**
 * Layout-route element — wraps every authenticated page in a Suspense
 * boundary. We use a layout-route (not a wrapping element on Layout)
 * because the sidebar/header are inside <Layout /> and we don't want to
 * re-suspend them on every navigation.
 */
export function SuspendedRoute() {
  return (
    <React.Suspense fallback={<PageLoadingFallback />}>
      <Outlet />
    </React.Suspense>
  );
}
