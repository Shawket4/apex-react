import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { LanguageToggle } from '@/widgets/language-toggle/language-toggle';
import { ThemeToggle } from '@/widgets/theme-toggle/theme-toggle';
import { UserMenu } from '@/widgets/user-menu/user-menu';

interface SidebarFooterProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/*                                                                            */
/* Identity, then the two preference toggles, then the collapse control. The   */
/* chevron is shown at every width: inside the mobile drawer the same handler  */
/* closes it, and the drawer is rendered without its own close button.         */
/* -------------------------------------------------------------------------- */

export function SidebarFooter({ collapsed, onToggleCollapse }: SidebarFooterProps) {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 space-y-2 border-t p-2">
      <UserMenu collapsed={collapsed} />

      <div
        className={cn(
          'flex items-center',
          collapsed ? 'flex-col items-center gap-2 pt-1' : 'justify-between px-1',
        )}
      >
        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 shrink-0"
          aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform duration-200 motion-reduce:transition-none',
              collapsed ? 'rotate-180 rtl:rotate-0' : 'rtl:rotate-180',
            )}
            aria-hidden
          />
        </Button>
      </div>
    </div>
  );
}
