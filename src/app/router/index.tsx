import * as React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { Layout } from '@/widgets/layout/layout';
import LoginPage from '@/pages/auth/login';
import { Skeleton } from '@/shared/ui/skeleton';
import { PERMISSION_LEVELS } from '@/shared/config/constants';

/* -------------------------------------------------------------------------- */
/* Lazy loaders                                                                */
/*                                                                             */
/* Every page below `/` is code-split. The `lazyNamed` helper handles the     */
/* placeholder file's named-export shape — all eleven placeholder pages live  */
/* in one module so they share a single chunk, which is fine.                 */
/* -------------------------------------------------------------------------- */

const lazyNamed = <K extends string>(
  loader: () => Promise<Record<K, React.ComponentType>>,
  name: K,
) => React.lazy(() => loader().then((m) => ({ default: m[name] })));

// Default-exported pages
const DashboardPage = React.lazy(() => import('@/pages/dashboard/dashboard'));
const FuelEventsPage = React.lazy(() => import('@/pages/fuel-events/fuel-events'));
const FuelEventNewPage = React.lazy(() => import('@/pages/fuel-events/fuel-event-new'));
const FuelEventEditPage = React.lazy(() => import('@/pages/fuel-events/fuel-event-edit'));
const FuelEventDetailsPage = React.lazy(
  () => import('@/pages/fuel-events/fuel-event-details'),
);
const DriversListPage = React.lazy(() => import('@/pages/drivers/drivers'));
const DriverDetailPage = React.lazy(() => import('@/pages/driver-detail/driver-detail'));
const DriverExpensesPage = React.lazy(
  () => import('@/pages/driver-expenses/driver-expenses'),
);
const AddDriverExpensePage = React.lazy(
  () => import('@/pages/driver-expenses/driver-expense-new'),
);
const DriverLoansPage = React.lazy(() => import('@/pages/driver-loans/driver-loans'));
const AddDriverLoanPage = React.lazy(() => import('@/pages/driver-loans/driver-loan-new'));
const NotFoundPage = React.lazy(() => import('@/pages/error/not-found'));
const TripsPage = React.lazy(() => import('@/pages/trips/trips'));
const TripNewPage = React.lazy(() => import('@/pages/trips/trip-new'));
const TripEditPage = React.lazy(() => import('@/pages/trips/trip-edit'));
const OilChangesPage = React.lazy(() => import('@/pages/oil-changes/oil-changes'));
const OilChangeNewPage = React.lazy(() => import('@/pages/oil-changes/oil-change-new'));
const OilChangeEditPage = React.lazy(() => import('@/pages/oil-changes/oil-change-edit'));
const OilChangeHistoryPage = React.lazy(
  () => import('@/pages/oil-changes/oil-change-history'),
);
const FeeMappingsPage = React.lazy(() => import('@/pages/fee-mappings/fee-mappings'));
const UsersPage = React.lazy(() => import('@/pages/users/users'));
const ServiceInvoicesPage = React.lazy(() => import('@/pages/service-invoices/service-invoices'));
const ServiceInvoiceNewPage = React.lazy(() => import('@/pages/service-invoices/service-invoice-new'));
const ServiceInvoiceEditPage = React.lazy(() => import('@/pages/service-invoices/service-invoice-edit'));
const ServiceInvoiceDetailsPage = React.lazy(() => import('@/pages/service-invoices/service-invoice-details'));

const EtitPage = React.lazy(() => import('@/pages/etit/etit'));

// Named exports — placeholder file. All resolve to the same chunk; the
// browser fetches it once and React picks the right component per route.
const placeholderLoader = () => import('@/pages/placeholder/placeholder');
const TrucksPage = lazyNamed(placeholderLoader, 'TrucksPage');
const CarsPage = lazyNamed(placeholderLoader, 'CarsPage');
const TiresPage = lazyNamed(placeholderLoader, 'TiresPage');
const PayrollPage = lazyNamed(placeholderLoader, 'PayrollPage');
const VendorsPage = lazyNamed(placeholderLoader, 'VendorsPage');
const FleetExpensesPage = lazyNamed(placeholderLoader, 'FleetExpensesPage');
const LogsPage = lazyNamed(placeholderLoader, 'LogsPage');
const SettingsPage = lazyNamed(placeholderLoader, 'SettingsPage');
const TabletsPage = lazyNamed(placeholderLoader, 'TabletsPage');
const SpeedViolationsPage = lazyNamed(placeholderLoader, 'SpeedViolationsPage');


/* -------------------------------------------------------------------------- */
/* Suspense fallback                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight skeleton shown while a route chunk is being fetched. Uses
 * the same outer paddings as `PageShell` so the layout doesn't reflow when
 * the real page mounts.
 */
function PageLoadingFallback() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

/**
 * Layout-route element — wraps every authenticated page in a Suspense
 * boundary. We use a layout-route (not a wrapping element on Layout)
 * because the sidebar/header are inside <Layout /> and we don't want to
 * re-suspend them on every navigation.
 */
function SuspendedRoute() {
  return (
    <React.Suspense fallback={<PageLoadingFallback />}>
      <Outlet />
    </React.Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* Route definitions                                                           */
/* -------------------------------------------------------------------------- */

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        element: <SuspendedRoute />,
        children: [
          { index: true, element: <DashboardPage /> },

          // Fuel events
          { path: 'fuel-events', element: <FuelEventsPage /> },
          {
            path: 'fuel-events/new',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <FuelEventNewPage />
              </ProtectedRoute>
            ),
          },
          { path: 'fuel-events/:id', element: <FuelEventDetailsPage /> },
          {
            path: 'fuel-events/:id/edit',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <FuelEventEditPage />
              </ProtectedRoute>
            ),
          },

          // Trips
          { path: '/trips', element: <TripsPage /> },
          { path: '/trips/new', element: <TripNewPage /> },
          { path: '/trips/multi-container/:parentId/edit', element: <TripEditPage /> },

          // Oil changes
          { path: 'oil-changes', element: <OilChangesPage /> },
          { path: 'oil-changes/new', element: <OilChangeNewPage /> },
          { path: 'oil-changes/:id/edit', element: <OilChangeEditPage /> },
          { path: 'oil-changes/car/:carId', element: <OilChangeHistoryPage /> },

          // Service Invoices
          { path: 'service-invoices', element: <ServiceInvoicesPage /> },
          { path: 'service-invoices/new', element: <ServiceInvoiceNewPage /> },
          { path: 'service-invoices/:id', element: <ServiceInvoiceDetailsPage /> },
          { path: 'service-invoices/:id/edit', element: <ServiceInvoiceEditPage /> },

          // Placeholder domains
          { path: 'trucks', element: <TrucksPage /> },
          { path: 'cars', element: <CarsPage /> },
          { path: 'tires', element: <TiresPage /> },
          { path: 'tablets', element: <TabletsPage /> },
          { path: 'speed-violations', element: <SpeedViolationsPage /> },
          { path: 'drivers', element: <DriversListPage /> },
          { path: 'drivers/:id', element: <DriverDetailPage /> },
          { path: 'drivers/:id/expenses', element: <DriverExpensesPage /> },
          {
            path: 'drivers/:id/expenses/new',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <AddDriverExpensePage />
              </ProtectedRoute>
            ),
          },
          { path: 'drivers/:id/loans', element: <DriverLoansPage /> },
          {
            path: 'drivers/:id/loans/new',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <AddDriverLoanPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'payroll',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <PayrollPage />
              </ProtectedRoute>
            ),
          },
          { path: 'vendors', element: <VendorsPage /> },
          {
            path: 'fleet-expenses',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <FleetExpensesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'fee-mappings',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <FeeMappingsPage />
              </ProtectedRoute>
            ),
          },
          { path: 'etit', element: <EtitPage /> },
          {
            path: 'users',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <UsersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'logs',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <LogsPage />
              </ProtectedRoute>
            ),
          },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);