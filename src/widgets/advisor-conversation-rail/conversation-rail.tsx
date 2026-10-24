import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useAdvisorConversations, useDeleteConversation } from '@/entities/advisor';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';

interface ConversationRailProps {
  activeId: string | null;
  /** While a turn streams, switching away is held off. */
  locked: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  /** The open conversation was deleted. */
  onDeletedActive: () => void;
  className?: string;
}

export function ConversationRail({
  activeId,
  locked,
  onOpen,
  onNew,
  onDeletedActive,
  className,
}: ConversationRailProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAdvisorConversations();
  const del = useDeleteConversation();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    try {
      await del.mutateAsync(id);
      if (id === activeId) onDeletedActive();
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <aside
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card', className)}
      aria-label={t('advisor.rail.title')}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-2">
        <span className="ps-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('advisor.rail.title')}
        </span>
        <Button size="sm" variant="outline" onClick={onNew} disabled={locked}>
          <Plus aria-hidden="true" />
          {t('advisor.rail.new')}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="flex flex-col gap-1.5 p-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-3 text-xs text-destructive">{t('advisor.rail.loadError')}</p>
        ) : !data || data.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">{t('advisor.rail.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {data.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    disabled={locked && !active}
                    onClick={() => onOpen(c.id)}
                    aria-current={active || undefined}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md py-2 pe-9 ps-2 text-start transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                    )}
                  >
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0">
                      <span dir="auto" className="block truncate text-sm">
                        {c.title || t('advisor.rail.untitled')}
                      </span>
                      <span className="block text-[10.5px] text-muted-foreground">
                        {formatDateTime(c.updated_at ?? c.created_at)}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={locked}
                    onClick={() => setDeleteId(c.id)}
                    aria-label={t('advisor.rail.delete')}
                    className="absolute end-1 top-1.5 h-7 w-7 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('advisor.rail.deleteTitle')}
        description={t('advisor.rail.deleteDescription')}
        confirmLabel={t('common.delete')}
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </aside>
  );
}
