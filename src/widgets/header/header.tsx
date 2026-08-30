import { Menu, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { ScopeBar, ScopeBarMobile } from '@/widgets/scope-bar/scope-bar';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({ onOpenMobileMenu, onOpenCommandPalette }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4 print:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 lg:hidden"
        onClick={onOpenMobileMenu}
        aria-label={t('common.openMenu')}
      >
        <Menu />
      </Button>

      <div className="flex flex-1 items-center justify-center">
        <ScopeBar />
      </div>

      <ScopeBarMobile />

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenCommandPalette}
        className="gap-2 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('common.search')}</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>
    </header>
  );
}
