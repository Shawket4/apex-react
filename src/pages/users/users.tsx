import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Users } from 'lucide-react';
import {
  useUsers,
  useRegisterUser,
  useUpdateUser,
  useDeleteUser,
} from '@/entities/user/queries';
import type { User } from '@/entities/user/schemas';
import { Button } from '@/shared/ui/button';
import { PageShell } from '@/shared/ui/page-shell';
import { SearchInput } from '@/shared/ui/search-input';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { toast } from '@/shared/ui/toaster';
import { UsersTable } from '@/widgets/users-table/users-table';
import { UserFormDialog } from '@/widgets/user-form-dialog/user-form-dialog';

export default function UsersPage() {
  const { t } = useTranslation();

  const { data: users = [], isLoading, refetch, isRefetching } = useUsers();
  const registerMutation = useRegisterUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [search, setSearch] = React.useState('');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null);

  const filteredUsers = React.useMemo(() => {
    const s = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.phone?.toLowerCase().includes(s),
    );
  }, [users, search]);

  const handleCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const onFormSubmit = async (data: any) => {
    try {
      if (editingUser) {
        await updateMutation.mutateAsync(data);
        toast({ title: t('common.saveSuccess') || 'Saved' });
      } else {
        await registerMutation.mutateAsync(data);
        toast({ title: t('common.createSuccess') || 'Created' });
      }
      setFormOpen(false);
    } catch (err) {
      toast({
        title: t('errors.generic'),
        variant: 'destructive',
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteMutation.mutateAsync(deletingUser.ID);
      toast({ title: t('common.deleteSuccess') || 'Deleted' });
      setDeletingUser(null);
    } catch (err) {
      toast({
        title: t('errors.generic'),
        variant: 'destructive',
      });
    }
  };

  return (
    <PageShell
      title={t('users.title')}
      description={t('users.subtitle')}
      icon={<Users className="h-5 w-5" />}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9 w-9"
          >
            <RefreshCw className={isRefetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button onClick={handleCreate} className="h-9 gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('users.addUser')}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder={t('users.searchPlaceholder')}
            value={search}
            onChange={setSearch}
            className="sm:max-w-sm"
          />
        </div>

        <UsersTable
          users={filteredUsers}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <UserFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          user={editingUser}
          onSubmit={onFormSubmit}
          loading={registerMutation.isPending || updateMutation.isPending}
        />

        <ConfirmDialog
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          title={t('users.delete.title')}
          description={t('users.delete.description', { name: deletingUser?.name || deletingUser?.email })}
          onConfirm={onConfirmDelete}
          loading={deleteMutation.isPending}
          variant="destructive"
        />
      </div>
    </PageShell>
  );
}
