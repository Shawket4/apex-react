import {
  Banknote,
  Boxes,
  Building2,
  Car,
  CircleDot,
  ClipboardCheck,
  Droplets,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  MapPin,
  MapPinned,
  Radar,
  Receipt,
  Route,
  Settings,
  ShieldCheck,
  Tablet,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSION_LEVELS } from '@/shared/config/constants';

/* -------------------------------------------------------------------------- */
/* What is in the nav, and nothing about how it looks                          */
/*                                                                            */
/* Data only, so the command palette can read the same list without pulling in */
/* the sidebar's component tree. Keeping it a module constant also means the   */
/* array identity never changes, which is what lets the permission filter and  */
/* every row below memoise honestly.                                          */
/* -------------------------------------------------------------------------- */

export interface NavItem {
  /** Route path. Also the React key, so it must be unique across the nav. */
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Hidden below this level; absent means everyone sees it. */
  minPermission?: number;
}

export interface NavSection {
  titleKey: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'nav.overview',
    items: [{ to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard }],
  },
  {
    titleKey: 'nav.operations',
    items: [
      { to: '/fuel-events', labelKey: 'nav.fuelEvents', icon: Fuel },
      { to: '/trips', labelKey: 'nav.trips', icon: Route },
      { to: '/etit', labelKey: 'nav.etit', icon: Radar },
      { to: '/zones', labelKey: 'nav.zones', icon: MapPin },
      {
        to: '/locations',
        labelKey: 'nav.locations',
        icon: MapPinned,
        minPermission: PERMISSION_LEVELS.MANAGER,
      },
      {
        to: '/trip-audit',
        labelKey: 'nav.tripAudit',
        icon: ClipboardCheck,
        minPermission: PERMISSION_LEVELS.MANAGER,
      },
      { to: '/receipt-piles', labelKey: 'nav.receiptPiles', icon: Boxes },
      { to: '/oil-changes', labelKey: 'nav.oilChanges', icon: Droplets },
      { to: '/service-invoices', labelKey: 'nav.serviceInvoices', icon: Wrench },
    ],
  },
  {
    titleKey: 'nav.fleet',
    items: [
      { to: '/trucks', labelKey: 'nav.trucks', icon: Truck },
      { to: '/cars', labelKey: 'nav.cars', icon: Car },
      { to: '/tires', labelKey: 'nav.tires', icon: CircleDot },
      {
        to: '/tablets',
        labelKey: 'nav.tablets',
        icon: Tablet,
        minPermission: PERMISSION_LEVELS.VIEWER,
      },
      { to: '/speed-violations', labelKey: 'nav.speedViolations', icon: Gauge },
    ],
  },
  {
    titleKey: 'nav.personnel',
    items: [{ to: '/drivers', labelKey: 'nav.drivers', icon: Users }],
  },
  {
    titleKey: 'nav.finance',
    items: [
      { to: '/vendors', labelKey: 'nav.vendors', icon: Building2 },
      {
        to: '/fee-mappings',
        labelKey: 'nav.feeMappings',
        icon: Banknote,
        minPermission: PERMISSION_LEVELS.MANAGER,
      },
      {
        to: '/fleet-expenses',
        labelKey: 'nav.fleetExpenses',
        icon: Receipt,
        minPermission: PERMISSION_LEVELS.ADMIN,
      },
    ],
  },
  {
    titleKey: 'nav.administration',
    items: [
      {
        to: '/users',
        labelKey: 'nav.users',
        icon: ShieldCheck,
        minPermission: PERMISSION_LEVELS.MANAGER,
      },
      {
        to: '/logs',
        labelKey: 'nav.logs',
        icon: FileText,
        minPermission: PERMISSION_LEVELS.ADMIN,
      },
      { to: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

/**
 * Is `pathname` inside `to`? Exact for the dashboard, prefix for the rest —
 * `/trips/new` lights up `/trips`, but `/trips` must not light up `/`.
 */
export function isRouteActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}
