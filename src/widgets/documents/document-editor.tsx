import * as React from 'react';
import { CircleAlert, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { useIsMobile } from '@/shared/hooks/use-media-query';
import { useLastPresent } from '@/shared/hooks/use-last-present';
import { documentErrorMessage } from '@/entities/document/errors';
import { useSaveDocumentVersion } from '@/entities/document/queries';
import type {
  DocumentCatalogue,
  DocumentType,
  DocumentVersion,
  OwnerDocument,
  OwnerKind,
  SaveVersionPayload,
} from '@/entities/document/schemas';
import { isImage } from '@/entities/document/status';
import { FileSlot } from './file-slot';
import { documentTypeName, isPaper, slotName } from './labels';
import { useDraftFiles } from './use-draft-files';

/** The limits FalconGo applies (documents/store.go), so the fields stop there. */
const MAX_LABEL = 80;
const MAX_NOTE = 1000;
/** No paper is issued for longer than this, and the calendar needs an end. */
const FAR_FUTURE = '2099-12-31';

/**
 * What the form is for.
 *
 * - `add`: a document the owner does not hold yet (a type, and a label for
 *   the types an owner holds several of).
 * - `renew`: a new version of a document, which becomes the current one.
 * - `edit`: a correction to a version already saved.
 */
export interface EditorTarget {
  mode: 'add' | 'renew' | 'edit';
  type: DocumentType;
  document?: OwnerDocument;
  version?: DocumentVersion;
  /** A new number per opening, so each opening starts a clean form. */
  session: number;
}

interface DocumentEditorProps {
  ownerKind: OwnerKind;
  ownerId: number | string;
  catalogue: DocumentCatalogue;
  target: EditorTarget | null;
  onClose: () => void;
}

export function DocumentEditor({ ownerKind, ownerId, catalogue, target, onClose }: DocumentEditorProps) {
  const shown = useLastPresent(target);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent stacked className="max-h-[90vh] max-w-xl overflow-y-auto overscroll-contain">
        {shown ? (
          <EditorForm
            key={shown.session}
            ownerKind={ownerKind}
            ownerId={ownerId}
            catalogue={catalogue}
            target={shown}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface EditorFormProps {
  ownerKind: OwnerKind;
  ownerId: number | string;
  catalogue: DocumentCatalogue;
  target: EditorTarget;
  onClose: () => void;
}

/** Tile proportions and grid per layout: a card is wide, a page is tall. */
function slotLook(type: DocumentType): { tile: string; grid: string } {
  switch (type.layout) {
    case 'sides':
      return { tile: 'aspect-[8/5]', grid: 'grid grid-cols-1' };
    case 'photo':
      return { tile: 'aspect-square', grid: 'grid max-w-[11rem] grid-cols-1' };
    case 'album':
      return { tile: 'aspect-square', grid: 'grid grid-cols-3 gap-2 sm:grid-cols-4' };
    default:
      return { tile: 'aspect-[3/4]', grid: 'grid grid-cols-3 gap-2 sm:grid-cols-4' };
  }
}

function EditorForm({ ownerKind, ownerId, catalogue, target, onClose }: EditorFormProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { mode, type, document, version } = target;
  const save = useSaveDocumentVersion(ownerKind, ownerId);

  // A renewal starts empty: it is a different paper with different dates. A
  // correction starts from what was saved.
  const editing = mode === 'edit' ? version : undefined;
  const [label, setLabel] = React.useState(document?.label ?? '');
  const [issueDate, setIssueDate] = React.useState(editing?.issue_date ?? '');
  const [expiryDate, setExpiryDate] = React.useState(editing?.expiry_date ?? '');
  const [note, setNote] = React.useState(editing?.note ?? '');
  const drafts = useDraftFiles(type, catalogue, editing?.files ?? []);

  const typeName = documentTypeName(t, type.key);
  const accept = catalogue.content_types
    .filter((contentType) => !type.images_only || isImage(contentType))
    .join(',');
  const look = slotLook(type);
  const maxMegabytes = Math.floor(catalogue.max_file_bytes / (1024 * 1024));

  const datesReversed = !!issueDate && !!expiryDate && expiryDate < issueDate;
  const empty = drafts.files.length === 0 && !issueDate && !expiryDate && !note.trim();
  const blocked = empty || drafts.uploading || drafts.failed || datesReversed || save.isPending;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    const payload: SaveVersionPayload = {
      issue_date: issueDate,
      expiry_date: expiryDate,
      note: note.trim(),
      files: drafts.refs,
    };
    if (mode === 'add') {
      payload.type_key = type.key;
      payload.label = label.trim();
    } else {
      payload.document_id = document?.id;
      // The label rides along on a correction: for a type an owner holds
      // several of it is part of what is being corrected.
      if (type.multiple) payload.label = label.trim();
    }
    save.mutate(
      { versionId: mode === 'edit' ? version?.id : undefined, payload },
      { onSuccess: onClose },
    );
  };

  const title =
    mode === 'add'
      ? t('documents.editor.addTitle', { type: typeName })
      : mode === 'edit'
        ? t('documents.editor.editTitle', { type: typeName })
        : isPaper(type)
          ? t('documents.editor.renewTitle', { type: typeName })
          : t('documents.editor.replaceTitle', { type: typeName });
  const description =
    mode === 'renew'
      ? t('documents.editor.renewDescription')
      : mode === 'edit'
        ? t('documents.editor.editDescription')
        : t('documents.editor.addDescription');

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {type.multiple ? (
        <div className="space-y-1.5">
          <Label htmlFor="document-label">{t('documents.fields.label')}</Label>
          <Input
            id="document-label"
            value={label}
            maxLength={MAX_LABEL}
            // A renewal is of this pass; which pass it is does not change.
            disabled={mode === 'renew'}
            placeholder={t('documents.fields.labelPlaceholder')}
            onChange={(event) => setLabel(event.target.value)}
            dir="auto"
          />
          <p className="text-xs text-muted-foreground">{t('documents.fields.labelHint')}</p>
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t('documents.editor.files')}</legend>
        <div className={type.layout === 'sides' ? 'grid grid-cols-2 gap-3' : undefined}>
          {type.slots.map((slot) => (
            <FileSlot
              key={slot.key}
              addLabel={t(`documents.editor.add.${slot.key}`, {
                defaultValue: t('documents.editor.add.file'),
              })}
              caption={type.layout === 'sides' ? slotName(t, slot.key) : undefined}
              files={drafts.files.filter((f) => f.slot === slot.key)}
              max={slot.max}
              accept={accept}
              camera={isMobile}
              disabled={save.isPending}
              tileClassName={look.tile}
              className={look.grid}
              onAdd={(files) => void drafts.add(slot.key, files)}
              onRemove={drafts.remove}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {type.images_only
            ? t('documents.editor.acceptImages', { size: maxMegabytes })
            : t('documents.editor.acceptAll', { size: maxMegabytes })}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="document-issue-date">{t('documents.fields.issueDate')}</Label>
          <DatePicker
            id="document-issue-date"
            value={issueDate}
            onChange={setIssueDate}
            clearable
            disabled={save.isPending}
            placeholder={t('documents.fields.noDate')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="document-expiry-date">{t('documents.fields.expiryDate')}</Label>
          <DatePicker
            id="document-expiry-date"
            value={expiryDate}
            onChange={setExpiryDate}
            max={FAR_FUTURE}
            clearable
            disabled={save.isPending}
            placeholder={t('documents.fields.noDate')}
          />
        </div>
        {datesReversed ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {t('documents.errors.expiry_before_issue')}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document-note">{t('documents.fields.note')}</Label>
        <Textarea
          id="document-note"
          value={note}
          maxLength={MAX_NOTE}
          rows={2}
          disabled={save.isPending}
          placeholder={t('documents.fields.notePlaceholder')}
          onChange={(event) => setNote(event.target.value)}
          dir="auto"
        />
      </div>

      {save.isError ? (
        <p
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{documentErrorMessage(save.error, t)}</span>
        </p>
      ) : null}

      <DialogFooter className="sm:items-center">
        <p className="text-xs text-muted-foreground sm:me-auto" aria-live="polite">
          {drafts.uploading
            ? t('documents.editor.waitUploading')
            : drafts.failed
              ? t('documents.editor.removeFailed')
              : empty
                ? t('documents.editor.nothingYet')
                : ''}
        </p>
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={blocked}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
