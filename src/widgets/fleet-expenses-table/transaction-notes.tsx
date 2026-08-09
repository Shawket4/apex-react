import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquarePlus, Trash2, Pencil, Check, X, StickyNote } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatDateTime } from '@/shared/lib/format';
import {
  useAddNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from '@/entities/raw-message/queries';

/**
 * Notes on a transaction.
 *
 * This is the destination of the ntfy deep link — the push says "tap to add a
 * note or correct it" and lands on the edit screen, so composing a note has to
 * work comfortably on a phone with one thumb. Hence the full-width composer and
 * large tap targets rather than an inline icon-only affordance.
 */
export function TransactionNotes({
  transactionId,
  canEdit,
}: {
  transactionId: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const notes = useNotes(transactionId);
  const addNote = useAddNote(transactionId);
  const updateNote = useUpdateNote(transactionId);
  const deleteNote = useDeleteNote(transactionId);

  const [draft, setDraft] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState('');

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    addNote.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t('fleetExpenses.notes.title')}</h2>
          {notes.data?.length ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {notes.data.length}
            </span>
          ) : null}
        </div>

        {canEdit && (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('fleetExpenses.notes.placeholder')}
              rows={3}
              dir="auto"
              // Ctrl/Cmd+Enter submits — a plain Enter must stay a newline,
              // since notes are frequently multi-line.
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={submit}
                disabled={!draft.trim() || addNote.isPending}
                className="w-full sm:w-auto"
              >
                <MessageSquarePlus className="h-4 w-4" />
                {t('fleetExpenses.notes.add')}
              </Button>
            </div>
          </div>
        )}

        {notes.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !notes.data?.length ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t('fleetExpenses.notes.empty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.data.map((note) => (
              <li key={note.id} className="rounded-md border p-3">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      dir="auto"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          updateNote.mutate(
                            { id: note.id, body: editDraft.trim() },
                            { onSuccess: () => setEditingId(null) },
                          )
                        }
                        disabled={!editDraft.trim()}
                      >
                        <Check className="h-4 w-4" />
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      dir="auto"
                      className="whitespace-pre-wrap break-words text-sm leading-relaxed"
                    >
                      {note.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{note.author ?? t('fleetExpenses.notes.unknownAuthor')}</span>
                      <span aria-hidden>·</span>
                      <span>{formatDateTime(note.created_at)}</span>
                      {canEdit && (
                        <span className="ms-auto flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common.edit')}
                            onClick={() => {
                              setEditingId(note.id);
                              setEditDraft(note.body);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common.delete')}
                            onClick={() => deleteNote.mutate(note.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
