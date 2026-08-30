import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/shared/lib/cn';
import { prefetchRoute } from '@/shared/lib/prefetch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { type NavItem } from './nav-config';

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  /** Query string carrying the global scope; computed once for the whole nav. */
  search: string;
  onNavigate?: () => void;
}

/* -------------------------------------------------------------------------- */
/* One row                                                                     */
/*                                                                            */
/* Memoised on purpose: every route change re-renders the nav, and without     */
/* this all twenty-odd rows would rebuild to change the two whose `active`     */
/* actually flipped.                                                          */
/*                                                                            */
/* Nothing here animates. The rail's width is the only thing that moves when   */
/* the sidebar collapses (see sidebar.tsx); the label simply becomes `sr-only`,*/
/* which keeps it in the accessibility tree — the previous build hid labels    */
/* with `invisible`, leaving collapsed links with no accessible name at all.   */
/* -------------------------------------------------------------------------- */

function SidebarNavItemImpl({
  item,
  active,
  collapsed,
  search,
  onNavigate,
}: SidebarNavItemProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const Icon = item.icon;
  const label = t(item.labelKey);

  // Intent prefetch: pointer, focus and touch all mean "about to go there", so
  // they all warm the destination's chunk and its mount-time query. Deduped by
  // the query client, so repeats are free.
  const warm = React.useCallback(
    () => prefetchRoute(item.to, queryClient),
    [item.to, queryClient],
  );

  const link = (
    <NavLink
      to={{ pathname: item.to, search }}
      onClick={onNavigate}
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center rounded-md text-sm font-medium touch-manipulation',
        'transition-colors motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed ? 'mx-auto w-9 justify-center' : 'w-full gap-3 px-3',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
    </NavLink>
  );

  // Collapsed to a 36px square, the icon is the only thing left to read, so it
  // gets a real tooltip. Expanded, the label is right there and a tooltip would
  // only be noise.
  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export const SidebarNavItem = React.memo(SidebarNavItemImpl);
