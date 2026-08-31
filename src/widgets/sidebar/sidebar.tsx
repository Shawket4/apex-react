import { useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { keepScopeSearch } from '@/shared/scope';
import { SidebarBrand } from './sidebar-brand';
import { SidebarFooter } from './sidebar-footer';
import { SidebarNav } from './sidebar-nav';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Called after a nav click — the mobile drawer uses it to close itself. */
  onNavigate?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* The sidebar                                                                 */
/*                                                                            */
/* One animated property in the whole tree: the rail's own width. Everything   */
/* inside swaps between two static layouts, because animating a max-width on   */
/* every label meant twenty-odd elements forcing layout on every frame of a    */
/* collapse — the reason this felt slow.                                       */
/*                                                                            */
/* The scope query string is read once here and handed down. `keepScopeSearch` */
/* reads the URL and localStorage and ignores the path it is given, so calling */
/* it per row was twenty identical reads on every render.                      */
/* -------------------------------------------------------------------------- */

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  className,
}: SidebarProps) {
  // `keepScopeSearch` reads the live URL and the persisted scope, so it has to
  // run after every navigation; `useLocation` is what re-renders us then. One
  // call per render is cheap — the old build made the same call once per row.
  const { pathname } = useLocation();
  const search = keepScopeSearch(pathname);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'flex h-full shrink-0 flex-col border-e bg-card print:hidden',
        'transition-[width] duration-200 ease-out motion-reduce:transition-none',
        collapsed ? 'w-[72px]' : 'w-64',
        className,
      )}
    >
      <SidebarBrand collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} search={search} onNavigate={onNavigate} />
      <SidebarFooter
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onNavigate={onNavigate}
      />
    </aside>
  );
}
