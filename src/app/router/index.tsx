import * as React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { SuspendedRoute } from './suspended-route';
import { Layout } from '@/widgets/layout/layout';
import LoginPage from '@/pages/auth/login';
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
const FleetExpensesPage = React.lazy(
  () => import('@/pages/fleet-expenses/fleet-expenses'),
);
const FleetExpenseNewPage = React.lazy(
  () => import('@/pages/fleet-expenses/fleet-expense-new'),
);
const FleetExpenseEditPage = React.lazy(
  () => import('@/pages/fleet-expenses/fleet-expense-edit'),
);
const FleetExpensesMessagesPage = React.lazy(
  () => import('@/pages/fleet-expenses/fleet-expenses-messages'),
);
const FuelEventNewPage = React.lazy(() => import('@/pages/fuel-events/fuel-event-new'));
const FuelEventEditPage = React.lazy(() => import('@/pages/fuel-events/fuel-event-edit'));
const FuelEventDetailsPage = React.lazy(
  () => import('@/pages/fuel-events/fuel-event-details'),
);
const DriversListPage = React.lazy(() => import('@/pages/drivers/drivers'));
const CarsPage = React.lazy(() => import('@/pages/cars/cars'));
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
const RouteErrorPage = React.lazy(() => import('@/pages/error/route-error'));

const OilChangesPage = React.lazy(() => import('@/pages/oil-changes/oil-changes'));
const OilChangeNewPage = React.lazy(() => import('@/pages/oil-changes/oil-change-new'));
const OilChangeEditPage = React.lazy(() => import('@/pages/oil-changes/oil-change-edit'));
const OilChangeHistoryPage = React.lazy(
  () => import('@/pages/oil-changes/oil-change-history'),
);
const FeeMappingsPage = React.lazy(() => import('@/pages/fee-mappings/fee-mappings'));
const ReceiptPilesPage = React.lazy(() => import('@/pages/receipt-piles/receipt-piles'));
const UsersPage = React.lazy(() => import('@/pages/users/users'));
const ServiceInvoicesPage = React.lazy(() => import('@/pages/service-invoices/service-invoices'));
const ServiceInvoiceNewPage = React.lazy(() => import('@/pages/service-invoices/service-invoice-new'));
const ServiceInvoiceEditPage = React.lazy(() => import('@/pages/service-invoices/service-invoice-edit'));
const ServiceInvoiceDetailsPage = React.lazy(() => import('@/pages/service-invoices/service-invoice-details'));

const TrackingPage = React.lazy(() => import('@/features/tracking/tracking-page'));
const ZonesPage = React.lazy(() => import('@/pages/zones/zones'));
const LocationsPage = React.lazy(() => import('@/pages/locations/locations'));
const TripAuditPage = React.lazy(() => import('@/pages/trip-audit/trip-audit'));
const TripReplayPage = React.lazy(() => import('@/pages/trip-replay/trip-replay'));

// Named exports — placeholder file. All resolve to the same chunk; the
// browser fetches it once and React picks the right component per route.
const placeholderLoader = () => import('@/pages/placeholder/placeholder');
const TrucksPage = lazyNamed(placeholderLoader, 'TrucksPage');
const TiresPage = lazyNamed(() => import('@/pages/tires/tires'), 'TiresPage');
const VendorsPage = lazyNamed(placeholderLoader, 'VendorsPage');
const LogsPage = lazyNamed(placeholderLoader, 'LogsPage');
const SettingsPage = React.lazy(() => import('@/pages/settings/settings'));
const TabletsPage = lazyNamed(placeholderLoader, 'TabletsPage');
const SpeedViolationsPage = lazyNamed(placeholderLoader, 'SpeedViolationsPage');


/* -------------------------------------------------------------------------- */
/* Route definitions                                                           */
/* -------------------------------------------------------------------------- */

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
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
          { path: 'trips', element: <TripsPage /> },
          { path: 'trips/new', element: <TripNewPage /> },
          { path: 'trips/multi-container/:parentId/edit', element: <TripEditPage /> },
          { path: 'trips/parent/:parentId/route-summary', element: <TrackingPage /> },

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
          {
            path: 'tires',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <TiresPage />
              </ProtectedRoute>
            ),
          },
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
          { path: 'vendors', element: <VendorsPage /> },
          // Fleet expenses — reads banksms.transactions; the legacy
          // fleet_expenses table is never touched.
          {
            path: 'fleet-expenses',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <FleetExpensesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'fleet-expenses/messages',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <FleetExpensesMessagesPage />
              </ProtectedRoute>
            ),
          },
          // The old review queue is gone; keep its URL working.
          {
            path: 'fleet-expenses/review',
            element: <Navigate to="/fleet-expenses/messages" replace />,
          },
          {
            path: 'fleet-expenses/new',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <FleetExpenseNewPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'fleet-expenses/:id/edit',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.ADMIN}>
                <FleetExpenseEditPage />
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
          {
            // Manager, matching the backend route: the plan names every
            // drop-off point and receipt number in the range.
            path: 'receipt-piles',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <ReceiptPilesPage />
              </ProtectedRoute>
            ),
          },
          { path: 'etit', element: <TrackingPage /> },
          {
            path: 'zones',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <ZonesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'locations',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <LocationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'trip-audit',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <TripAuditPage />
              </ProtectedRoute>
            ),
          },
          {
            // Full-screen replay takeover — deep-linkable.
            path: 'trip-audit/:id/replay',
            element: (
              <ProtectedRoute minPermissionLevel={PERMISSION_LEVELS.MANAGER}>
                <TripReplayPage />
              </ProtectedRoute>
            ),
          },
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