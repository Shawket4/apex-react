import { LogOut, User as UserIcon, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useAuthStore } from '@/shared/auth/store';
import { useLogout } from '@/entities/auth/queries';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

function initials(name?: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function roleLabel(level: number): string {
  if (level >= PERMISSION_LEVELS.ADMIN) return 'Admin';
  if (level >= PERMISSION_LEVELS.MANAGER) return 'Manager';
  if (level >= PERMISSION_LEVELS.EDITOR) return 'Editor';
  return 'Viewer';
}

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto justify-start gap-2 px-2 py-2 transition-all duration-200 ease-out",
            collapsed ? "w-9 mx-auto px-0 justify-center" : "w-full"
          )}
          aria-label={t('common.profile')}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'flex-grow flex items-center justify-between text-start transition-all duration-200 ease-out overflow-hidden',
              collapsed ? 'max-w-0 opacity-0 pointer-events-none invisible' : 'max-w-40 opacity-100'
            )}
          >
            <div className="flex-grow min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel(user.permission)}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-0.5">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="h-4 w-4" />
          {t('common.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          {t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
