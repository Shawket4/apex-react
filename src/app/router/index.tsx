import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import { Layout } from '@/widgets/layout/layout';
import LoginPage from '@/pages/auth/login';
import DashboardPage from '@/pages/dashboard/dashboard';
import FuelEventsPage from '@/pages/fuel-events/fuel-events';
import FuelEventNewPage from '@/pages/fuel-events/fuel-event-new';
import FuelEventEditPage from '@/pages/fuel-events/fuel-event-edit';
import FuelEventDetailsPage from '@/pages/fuel-events/fuel-event-details';
import DriversListPage from '@/pages/drivers/drivers';
import DriverDetailPage from '@/pages/driver-detail/driver-detail';
import DriverExpensesPage from '@/pages/driver-expenses/driver-expenses';
import AddDriverExpensePage from '@/pages/driver-expenses/driver-expense-new';
import DriverLoansPage from '@/pages/driver-loans/driver-loans';
import AddDriverLoanPage from '@/pages/driver-loans/driver-loan-new';
import NotFoundPage from '@/pages/error/not-found';
import TripsPage from '@/pages/trips/trips';
import TripNewPage from '@/pages/trips/trip-new';
import TripEditPage from '@/pages/trips/trip-edit';

import {
  OilChangesPage,
  TrucksPage,
  CarsPage,
  TiresPage,
  PayrollPage,
  VendorsPage,
  FleetExpensesPage,
  UsersPage,
  LogsPage,
  SettingsPage,
  TabletsPage,
  SpeedViolationsPage,
} from '@/pages/placeholder/placeholder';
import { PERMISSION_LEVELS } from '@/shared/config/constants';

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

      // Placeholder domains
      { path: 'oil-changes', element: <OilChangesPage /> },
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
  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
