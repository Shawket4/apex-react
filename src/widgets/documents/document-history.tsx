import * as React from 'react';
import { EyeOff, Loader2, Pencil, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { formatCairoDate, formatCairoDateTime } from '@/shared/lib/cairo';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { useLastPresent } from '@/shared/hooks/use-last-present';
import {
  useHideDocumentVersion,
  useRestoreDocumentVersion,
} from '@/entities/document/queries';
import type {
  DocumentFile,
  DocumentType,
  DocumentVersion,
  OwnerDocument,
  OwnerKind,
} from '@/entities/document/schemas';
import { FileThumb } from './file-thumb';
import { documentName, slotName } from './labels';
import { DocumentStatusBadge } from './status-badge';

/** A document and the type it is one of: what the sheet is opened on. */
export interface HistoryTarget {
  type: DocumentType;
  document: OwnerDocument;
}

interface DocumentHistoryProps {
  ownerKind: OwnerKind;
  ownerId: number | string;
  target: HistoryTarget | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: (type: DocumentType, document: OwnerDocument, version: DocumentVersion) => void;
  onOpenFiles: (
    type: DocumentType,
    document: OwnerDocument,
    files: DocumentFile[],
    index: number,
  ) => void;
}

/**
 * Every version of one document, newest first: what it said, who saved it and
 * when. A renewal never overwrites, so this is the paper trail. A manager can
 * correct a version, hide one saved by mistake, or bring a hidden one back.
 */
export function DocumentHistory({
  ownerKind,
  ownerId,
  target,
  canManage,
  onClose,
  onEdit,
  onOpenFiles,
}: DocumentHistoryProps) {
  const { t } = useTranslation();
  const shown = useLastPresent(target);

  const hide = useHideDocumentVersion(ownerKind, ownerId);
  const restore = useRestoreDocumentVersion(ownerKind, ownerId);
  const [hiding, setHiding] = React.useState<DocumentVersion | null>(null);

  return (
    <>
      <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {shown ? (
            <>
              <SheetHeader className="border-b px-4 py-3 pe-12">
                <SheetTitle className="text-base" dir="auto">
                  {documentName(t, shown.type.key, shown.document.label)}
                </SheetTitle>
                <SheetDescription>
                  {t('documents.history.description', { count: shown.document.versions.length })}
                </SheetDescription>
              </SheetHeader>
              <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
                {shown.document.versions.map((version) => (
                  <li key={version.id}>
                    <VersionEntry
                      type={shown.type}
                      document={shown.document}
                      version={version}
                      canManage={canManage}
                      restoring={restore.isPending && restore.variables === version.id}
                      onEdit={() => onEdit(shown.type, shown.document, version)}
                      onHide={() => setHiding(version)}
                      onRestore={() => restore.mutate(version.id)}
                      onOpenFile={(index) =>
                        onOpenFiles(shown.type, shown.document, version.files, index)
                      }
                    />
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        stacked
        open={hiding !== null}
        onOpenChange={(open) => !open && setHiding(null)}
        title={t('documents.history.hideTitle')}
        description={t('documents.history.hideDescription')}
        confirmLabel={t('documents.actions.hide')}
        variant="destructive"
        loading={hide.isPending}
        onConfirm={() => {
          if (!hiding) return;
          hide.mutate(hiding.id, { onSettled: () => setHiding(null) });
        }}
      />
    </>
  );
}

interface VersionEntryProps {
  type: DocumentType;
  document: OwnerDocument;
  version: DocumentVersion;
  canManage: boolean;
  restoring: boolean;
  onEdit: () => void;
  onHide: () => void;
  onRestore: () => void;
  onOpenFile: (index: number) => void;
}

function VersionEntry({
  type,
  document,
  version,
  canManage,
  restoring,
  onEdit,
  onHide,
  onRestore,
  onOpenFile,
}: VersionEntryProps) {
  const { t, i18n } = useTranslation();
  const current = document.current_version_id === version.id;
  const captioned = type.layout === 'sides';

  return (
    <article
      className={cn(
        'space-y-3 rounded-lg border bg-card p-3',
        current && 'border-primary/50',
        version.hidden && 'border-dashed bg-muted/30',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <p className="me-auto text-sm font-semibold">
          {formatCairoDate(version.created_at, i18n.language)}
        </p>
        {current ? <Badge>{t('documents.history.current')}</Badge> : null}
        {version.hidden ? (
          <Badge variant="secondary">
            <EyeOff className="h-3 w-3" aria-hidden />
            {t('documents.history.hidden')}
          </Badge>
        ) : null}
        {current && version.expiry_date ? (
          <DocumentStatusBadge expiryDate={version.expiry_date} />
        ) : null}
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t('documents.fields.issueDate')}</dt>
          <dd className="font-medium">
            {version.issue_date ? formatCairoDate(version.issue_date, i18n.language) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('documents.fields.expiryDate')}</dt>
          <dd className="font-medium">
            {version.expiry_date ? formatCairoDate(version.expiry_date, i18n.language) : '—'}
          </dd>
        </div>
      </dl>

      {version.note ? (
        <p className="whitespace-pre-line text-xs text-muted-foreground" dir="auto">
          {version.note}
        </p>
      ) : null}

      {version.files.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {version.files.map((file, index) => (
            <FileThumb
              key={file.id}
              file={file}
              restricted={document.restricted}
              caption={captioned ? slotName(t, file.slot) : undefined}
              className="aspect-square"
              onOpen={() => onOpenFile(index)}
            />
          ))}
        </div>
      ) : null}

      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
        <li>
          {t(`documents.history.source.${version.source}`, {
            defaultValue: t('documents.history.source.upload'),
          })}
          {' · '}
          {/* The old records never said who; the day they were carried over is all there is. */}
          {version.created_by_name
            ? t('documents.history.by', {
                name: version.created_by_name,
                when: formatCairoDateTime(version.created_at, i18n.language),
              })
            : formatCairoDateTime(version.created_at, i18n.language)}
        </li>
        {version.updated_at ? (
          <li>
            {t('documents.history.editedBy', {
              name: version.updated_by_name || t('common.unknown'),
              when: formatCairoDateTime(version.updated_at, i18n.language),
            })}
          </li>
        ) : null}
        {version.hidden && version.hidden_at ? (
          <li>
            {t('documents.history.hiddenBy', {
              name: version.hidden_by_name || t('common.unknown'),
              when: formatCairoDateTime(version.hidden_at, i18n.language),
            })}
          </li>
        ) : null}
      </ul>

      {canManage ? (
        <footer className="flex flex-wrap gap-2">
          {version.hidden ? (
            <Button type="button" variant="outline" size="sm" disabled={restoring} onClick={onRestore}>
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden />
              )}
              {t('documents.actions.restore')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4" aria-hidden />
                {t('common.edit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onHide}
              >
                <EyeOff className="h-4 w-4" aria-hidden />
                {t('documents.actions.hide')}
              </Button>
            </>
          )}
        </footer>
      ) : null}
    </article>
  );
}
