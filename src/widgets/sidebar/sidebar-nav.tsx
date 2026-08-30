import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { isRouteActive } from './nav-config';
import { SidebarNavItem } from './sidebar-nav-item';
import { useNavSections } from './use-nav-sections';

interface SidebarNavProps {
  collapsed: boolean;
  search: string;
  onNavigate?: () => void;
}

/* -------------------------------------------------------------------------- */
/* The sections                                                                */
/*                                                                            */
/* Collapsed, the section headings would be six words with nowhere to go, so   */
/* they are replaced by a hairline between groups — rendered only when it is    */
/* actually needed rather than kept in the tree with its borders switched off. */
/* -------------------------------------------------------------------------- */

export function SidebarNav({ collapsed, search, onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const sections = useNavSections();

  return (
    <ScrollArea className="flex-1">
      <nav aria-label={t('nav.primary')} className="flex flex-col gap-4 p-3">
        {sections.map((section, index) => (
          <div key={section.titleKey} className="space-y-1">
            {collapsed ? (
              index > 0 && <div className="mx-2 my-2 border-t" aria-hidden />
            ) : (
              <h3 className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(section.titleKey)}
              </h3>
            )}
            <ul className={cn('space-y-0.5')}>
              {section.items.map((item) => (
                <li key={item.to}>
                  <SidebarNavItem
                    item={item}
                    active={isRouteActive(pathname, item.to)}
                    collapsed={collapsed}
                    search={search}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
