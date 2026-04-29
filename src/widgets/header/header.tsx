import { Menu, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({ onOpenMobileMenu, onOpenCommandPalette }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 print:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        onClick={onOpenCommandPalette}
        className="gap-2 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('common.search')}</span>
        <kbd className="pointer-events-none hidden items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    </header>
  );
}
