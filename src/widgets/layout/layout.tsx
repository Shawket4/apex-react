import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/widgets/sidebar';
import { Header } from '@/widgets/header/header';
import { CommandPalette } from '@/widgets/command-palette/command-palette';
import { useCommandPalette } from '@/widgets/command-palette/use-command-palette';
import { Sheet, SheetContent } from '@/shared/ui/sheet';
import { useIsDesktop } from '@/shared/hooks/use-media-query';
import { useLayoutStore } from '@/shared/hooks/use-layout-store';

export function Layout() {
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isDesktop = useIsDesktop();

  return (
    // h-dvh (not min-h-dvh) bounds the flex row to the viewport, so the
    // main column becomes its own scroll context instead of letting the
    // whole page scroll past the sidebar.
    <div className="flex h-dvh bg-background">
      {/* Desktop sidebar — fixed, collapsible, always viewport-height */}
      {isDesktop && (
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      )}

      {/* Mobile sidebar — slide-out Sheet */}
      {!isDesktop && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          {/* w-64 to match the rail exactly. At w-72 the sheet was 32px wider
              than the sidebar inside it, and that strip of sheet background
              showed as grey dead space down the side of the drawer. */}
          <SheetContent side="left" className="w-64 max-w-[85vw] p-0" hideCloseButton>
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              // w-full so the rail fills the drawer whatever its width, rather
              // than relying on the two numbers being kept in step by hand.
              // No width transition here: nothing collapses inside a drawer.
              className="h-dvh w-full border-e-0 transition-none"
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main column — owns its own scroll so the sidebar stays pinned */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="print:hidden">
          <Header
            onOpenMobileMenu={() => setMobileOpen(true)}
            onOpenCommandPalette={() => setPaletteOpen(true)}
          />
        </div>
        {/* `relative` is load-bearing, not decoration. An absolutely positioned
            descendant with no positioned ancestor resolves against the initial
            containing block, which puts it at its static position in DOCUMENT
            space — outside this scroll container — and stretches
            documentElement.scrollHeight to match. That is how a page-wide
            overscroll appears from a 1px .sr-only label. */}
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}