import { useMemo } from 'react';
import { useAuthStore } from '@/shared/auth/store';
import { PERMISSION_LEVELS, type PermissionLevel } from '@/shared/config/constants';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const level = user?.permission ?? 0;

    const atLeast = (required: PermissionLevel) => level >= required;

    return {
      level,
      atLeast,
      isViewer: atLeast(PERMISSION_LEVELS.VIEWER),
      isEditor: atLeast(PERMISSION_LEVELS.EDITOR),
      isManager: atLeast(PERMISSION_LEVELS.MANAGER),
      isAdmin: atLeast(PERMISSION_LEVELS.ADMIN),
      // Fuel events are admin-only end to end — there is no view-only tier, so
      // the same level gates the list, the detail page and every mutation.
      canViewFuel: atLeast(PERMISSION_LEVELS.ADMIN),
      canEditFuel: atLeast(PERMISSION_LEVELS.ADMIN),
      canDeleteFuel: atLeast(PERMISSION_LEVELS.ADMIN),
      canManageUsers: atLeast(PERMISSION_LEVELS.MANAGER),
      canViewLogs: atLeast(PERMISSION_LEVELS.ADMIN),
      canManageExpenses: atLeast(PERMISSION_LEVELS.ADMIN),
    };
  }, [user?.permission]);
}
