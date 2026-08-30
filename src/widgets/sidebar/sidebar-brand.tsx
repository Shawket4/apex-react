import { Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/*                                                                            */
/* The mark stays put at both widths; only the wordmark comes and goes. It is  */
/* unmounted rather than hidden — there is nothing to read in a 72px rail, and */
/* keeping it in the tree only to animate its max-width was what made the      */
/* collapse janky.                                                             */
/* -------------------------------------------------------------------------- */

export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex h-16 shrink-0 items-center border-b',
        collapsed ? 'justify-center px-2' : 'gap-3 px-4',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Truck className="h-4 w-4" aria-hidden />
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight" translate="no">
            {t('common.appName')}
          </p>
          <p className="truncate text-xs text-muted-foreground">{t('common.tagline')}</p>
        </div>
      )}
    </div>
  );
}
