import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Fuel,
  Route,
  Droplets,
  Truck,
  Car,
  CircleDot,
  Users,
  Wallet,
  Building2,
  Receipt,
  ShieldCheck,
  FileText,
  Settings,
  ChevronLeft,
  Tablet,
  Gauge,
  Banknote,
  Radar,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { UserMenu } from '@/widgets/user-menu/user-menu';
import { ThemeToggle } from '@/widgets/theme-toggle/theme-toggle';
import { LanguageToggle } from '@/widgets/language-toggle/language-toggle';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { PERMISSION_LEVELS } from '@/shared/config/constants';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
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
    { to: '/oil-changes', labelKey: 'nav.oilChanges', icon: Droplets },
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
    items: [
      { to: '/drivers', labelKey: 'nav.drivers', icon: Users },
      {
        to: '/payroll',
        labelKey: 'nav.payroll',
        icon: Wallet,
        minPermission: PERMISSION_LEVELS.MANAGER,
      },
    ],
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

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate, className }: SidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { atLeast } = usePermissions();

  const visibleSections = React.useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.minPermission || atLeast(item.minPermission as 1 | 2 | 3 | 4),
        ),
      })).filter((section) => section.items.length > 0),
    [atLeast],
  );

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        // h-full is correct now that the Layout bounds the parent to h-dvh;
        // the aside fills that bounded height and never grows with content.
        'group/sidebar flex h-full shrink-0 flex-col border-e bg-card transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-64',
        className,
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 border-b px-4',
          collapsed && 'justify-center px-2',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Truck className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{t('common.appName')}</p>
            <p className="truncate text-xs text-muted-foreground">{t('common.tagline')}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-4 p-3">
          {visibleSections.map((section) => (
            <div key={section.titleKey} className="space-y-1">
              {!collapsed && (
                <h3 className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(section.titleKey)}
                </h3>
              )}
              {collapsed && section !== visibleSections[0] && (
                <div className="mx-2 my-1 border-t" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + '/');
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          collapsed && 'justify-center',
                        )}
                        title={collapsed ? t(item.labelKey) : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer — always locked to the bottom because the aside has bounded height */}
      <div className="shrink-0 border-t">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <LanguageToggle />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="hidden md:inline-flex"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
            <div className="p-2 pt-0">
              <UserMenu />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 p-2">
            <UserMenu collapsed />
            <div className="my-1 w-full border-t" />
            <ThemeToggle />
            <LanguageToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="hidden md:inline-flex"
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="h-4 w-4 rotate-180 rtl:rotate-0" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}