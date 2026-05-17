import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/widgets/sidebar/sidebar';
import { Header } from '@/widgets/header/header';
import { CommandPalette, useCommandPalette } from '@/widgets/command-palette/command-palette';
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
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0" hideCloseButton>
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              className="h-dvh border-e-0"
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}