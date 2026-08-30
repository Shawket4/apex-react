import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Edit,
  MoreHorizontal,
  Phone,
  Shield,
  Trash2,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react';
import type { User } from '@/entities/user/schemas';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatCard } from '@/shared/ui/stat-card';

interface UsersTableProps {
  users: User[];
  loading?: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({
  users,
  loading,
  onEdit,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation();

  const stats = React.useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.permission >= 3).length;
    const managers = users.filter((u) => u.permission === 2).length;
    const regulars = users.filter((u) => u.permission === 1).length;
    return { total, admins, managers, regulars };
  }, [users]);

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('users.stats.total')}
          value={stats.total}
          icon={UsersIcon}
          tone="primary"
        />
        <StatCard
          label={t('users.stats.regulars')}
          value={stats.regulars}
          icon={UserIcon}
          tone="default"
        />
        <StatCard
          label={t('users.stats.managers')}
          value={stats.managers}
          icon={Shield}
          tone="default"
        />
        <StatCard
          label={t('users.stats.admins')}
          value={stats.admins}
          icon={Shield}
          tone="default"
        />
      </div>

      {users.length === 0 && !loading ? (
        <EmptyState
          lottieSrc="/animations/no_results.json"
          lottieWidth={110}
          lottieHeight={110}
          title={t('common.noResults')}
        />
      ) : (
        <>
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <table className="w-full text-start text-sm">
          <thead className="border-b bg-muted/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('users.fields.name')}</th>
              <th className="px-4 py-3 font-semibold">{t('users.fields.email')}</th>
              <th className="px-4 py-3 font-semibold">{t('users.fields.phone')}</th>
              <th className="px-4 py-3 font-semibold">{t('users.fields.permission')}</th>
              <th className="px-4 py-3 font-semibold">{t('users.fields.createdAt')}</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.ID} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{user.name || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                  {user.phone || '—'}
                </td>
                <td className="px-4 py-3">
                  <PermissionBadge permission={user.permission} />
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                  {user.created_at ? formatDateTime(user.created_at) : '—'}
                </td>
                <td className="px-4 py-3">
                  <UserActions user={user} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {users.map((user) => (
          <MobileUserCard
            key={user.ID}
            user={user}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
        </>
      )}
    </div>
  );
}

function PermissionBadge({ permission }: { permission: number }) {
  const { t } = useTranslation();
  const label =
    {
      1: t('users.permissions.user'),
      2: t('users.permissions.manager'),
      3: t('users.permissions.admin'),
      4: t('users.permissions.superAdmin'),
    }[permission] || t('common.unknown');

  const variant = (
    {
      1: 'outline',
      2: 'outline',
      3: 'secondary',
      4: 'secondary',
    } as const
  )[permission] || 'outline';

  return <Badge variant={variant}>{label}</Badge>;
}

function UserActions({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t('common.actions')}
          title={t('common.actions')}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Edit className="me-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('common.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="me-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileUserCard({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{user.name || '—'}</h3>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <PermissionBadge permission={user.permission} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs border-t pt-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" aria-hidden="true" />
            {t('users.fields.phone')}
          </p>
          <p className="font-medium text-foreground font-mono tabular-nums truncate">
            {user.phone || '—'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {t('users.fields.createdAt')}
          </p>
          <p className="font-medium text-foreground font-mono tabular-nums truncate">
            {user.created_at ? formatDateTime(user.created_at) : '—'}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={() => onEdit(user)} className="h-8 gap-1.5 text-xs">
          <Edit className="h-3 w-3" aria-hidden="true" />
          {t('common.edit')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/5"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
