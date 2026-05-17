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
  Wrench,
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
        'group/sidebar flex h-full shrink-0 flex-col border-e bg-card transition-[width] duration-200 ease-out print:hidden',
        collapsed ? 'w-[72px]' : 'w-64',
        className,
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 border-b transition-all duration-200 ease-out',
          collapsed ? 'justify-center px-2' : 'px-4 gap-3',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-all duration-200">
          <Truck className="h-4 w-4" />
        </div>
        <div
          className={cn(
            'min-w-0 flex-grow transition-all duration-200 ease-out overflow-hidden origin-left',
            collapsed ? 'max-w-0 opacity-0 pointer-events-none invisible' : 'max-w-40 opacity-100 ml-2'
          )}
        >
          <p className="truncate text-sm font-semibold leading-tight">{t('common.appName')}</p>
          <p className="truncate text-xs text-muted-foreground">{t('common.tagline')}</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-4 p-3">
          {visibleSections.map((section) => (
            <div key={section.titleKey} className="space-y-1">
              <h3 className={cn(
                "px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-all duration-200 ease-out overflow-hidden origin-left",
                collapsed ? "max-h-0 opacity-0 my-0 py-0" : "max-h-8 opacity-100",
              )}>
                {t(section.titleKey)}
              </h3>
              <div className={cn(
                "mx-2 transition-all duration-200 ease-out",
                collapsed && section !== visibleSections[0] ? "my-2 border-t opacity-100" : "my-0 border-t-0 h-0 opacity-0 pointer-events-none"
              )} />
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
                          'flex items-center rounded-md text-sm font-medium transition-all duration-200 ease-out',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          collapsed ? 'h-9 w-9 mx-auto justify-center px-0 gap-0' : 'h-9 px-3 gap-3 w-full',
                        )}
                        title={collapsed ? t(item.labelKey) : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0 transition-transform duration-200" />
                        <span className={cn(
                          'truncate transition-all duration-200 ease-out origin-left',
                          collapsed ? 'max-w-0 opacity-0 pointer-events-none invisible' : 'max-w-40 opacity-100',
                        )}>
                          {t(item.labelKey)}
                        </span>
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
      <div className="shrink-0 border-t p-2">
        <div className="space-y-2">
          {/* User Menu */}
          <UserMenu collapsed={collapsed} />

          {/* Controls (ThemeToggle, LanguageToggle, and Collapse/Expand Button) */}
          <div className={cn(
            "flex items-center transition-all duration-200 ease-out",
            collapsed ? "flex-col gap-2 pt-1" : "justify-between px-1"
          )}>
            <div className={cn("flex gap-1", collapsed ? "flex-col" : "items-center")}>
              <ThemeToggle />
              <LanguageToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="hidden md:inline-flex h-8 w-8 shrink-0 transition-transform duration-200"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform duration-200",
                collapsed ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180"
              )} />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}