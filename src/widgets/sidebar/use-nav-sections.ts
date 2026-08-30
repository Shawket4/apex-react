import { useMemo } from 'react';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { NAV_SECTIONS, type NavSection } from './nav-config';

/**
 * The nav this user may see. Keyed on the permission level alone, so the result
 * is referentially stable for the whole session and the rows below can memoise
 * against it. A section with nothing left in it disappears rather than becoming
 * a heading over empty space.
 */
export function useNavSections(): NavSection[] {
  const { level } = usePermissions();

  return useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => (item.minPermission ?? 0) <= level),
      })).filter((section) => section.items.length > 0),
    [level],
  );
}
