import { History, ImagePlus, Lock, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { formatCairoDate } from '@/shared/lib/cairo';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import type {
  DocumentFile,
  DocumentType,
  DocumentVersion,
  OwnerDocument,
} from '@/entities/document/schemas';
import { currentVersion } from '@/entities/document/status';
import { FileThumb } from './file-thumb';
import { documentName, isPaper, slotName } from './labels';
import { DocumentStatusBadge } from './status-badge';
import { documentTypeIcon } from './type-icon';

/** How many tiles a card shows before "+N". */
const ALBUM_PREVIEW = 4;

export interface DocumentCardActions {
  onAdd: (type: DocumentType) => void;
  onRenew: (type: DocumentType, document: OwnerDocument) => void;
  onEdit: (type: DocumentType, document: OwnerDocument, version: DocumentVersion) => void;
  onHistory: (document: OwnerDocument) => void;
  onOpenFiles: (
    type: DocumentType,
    document: OwnerDocument,
    files: DocumentFile[],
    index: number,
  ) => void;
}

interface DocumentCardProps extends DocumentCardActions {
  type: DocumentType;
  /** The owner's document of this type; absent when it has not been added. */
  document?: OwnerDocument;
  canManage: boolean;
}

/**
 * One document on an owner's page: what it is, where it stands, its files and
 * what can be done with it. The same card for a licence, a certificate and an
 * album; only the tiles differ, by the type's layout.
 */
export function DocumentCard({
  type,
  document,
  canManage,
  onAdd,
  onRenew,
  onEdit,
  onHistory,
  onOpenFiles,
}: DocumentCardProps) {
  const { t, i18n } = useTranslation();
  const Icon = documentTypeIcon(type.key);
  const version = document ? currentVersion(document) : null;
  const name = documentName(t, type.key, document?.label);

  // Not added yet, or every version of it has been hidden.
  if (!document || !version) {
    const hiddenOnly = !!document && document.versions.length > 0;
    return (
      <article className="flex flex-col gap-3 rounded-lg border border-dashed bg-card/50 p-4">
        <header className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold" dir="auto">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {hiddenOnly ? t('documents.card.allHidden') : t('documents.status.notAdded')}
            </p>
          </div>
        </header>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (document ? onRenew(type, document) : onAdd(type))}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t('documents.actions.add')}
            </Button>
          ) : null}
          {hiddenOnly && document ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onHistory(document)}>
              <History className="h-4 w-4" aria-hidden />
              {t('documents.actions.history')}
            </Button>
          ) : null}
        </div>
      </article>
    );
  }

  const files = version.files;
  const captioned = type.layout === 'sides';
  const shownFiles = type.layout === 'album' ? files.slice(0, ALBUM_PREVIEW) : files;
  const more = files.length - shownFiles.length;
  const versionCount = document.versions.length;

  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" dir="auto">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {version.expiry_date
              ? t('documents.card.expires', {
                  date: formatCairoDate(version.expiry_date, i18n.language),
                })
              : isPaper(type)
                ? t('documents.card.noExpiry')
                : t('documents.card.photos', { count: files.length })}
          </p>
        </div>
        {version.expiry_date ? <DocumentStatusBadge expiryDate={version.expiry_date} /> : null}
      </header>

      {files.length > 0 ? (
        <div
          className={cn(
            'grid gap-2',
            type.layout === 'sides' && 'grid-cols-2',
            type.layout === 'photo' && 'max-w-[9rem] grid-cols-1',
            (type.layout === 'pages' || type.layout === 'album') && 'grid-cols-4',
          )}
        >
          {shownFiles.map((file, index) => (
            <div key={file.id} className="relative min-w-0">
              <FileThumb
                file={file}
                restricted={document.restricted}
                caption={captioned ? slotName(t, file.slot) : undefined}
                className={cn(
                  type.layout === 'sides' && 'aspect-[8/5]',
                  type.layout === 'pages' && 'aspect-[3/4]',
                  (type.layout === 'photo' || type.layout === 'album') && 'aspect-square',
                )}
                onOpen={() => onOpenFiles(type, document, files, index)}
              />
              {more > 0 && index === shownFiles.length - 1 && !document.restricted ? (
                <button
                  type="button"
                  onClick={() => onOpenFiles(type, document, files, index)}
                  className="absolute inset-0 flex items-center justify-center rounded-md bg-black/55 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('documents.card.moreFiles', { count: more })}
                >
                  +{more}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t('documents.card.noFiles')}
        </p>
      )}

      {document.restricted && files.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t('documents.restricted')}
        </p>
      ) : null}

      {version.issue_date || version.note ? (
        <dl className="space-y-1 text-xs">
          {version.issue_date ? (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{t('documents.fields.issueDate')}</dt>
              <dd className="font-medium">{formatCairoDate(version.issue_date, i18n.language)}</dd>
            </div>
          ) : null}
          {version.note ? (
            <div>
              <dt className="sr-only">{t('documents.fields.note')}</dt>
              <dd className="line-clamp-2 whitespace-pre-line text-muted-foreground" dir="auto">
                {version.note}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {!canManage ? null : type.layout === 'album' ? (
          // An album grows: its one action opens it to add photos or take some out.
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(type, document, version)}
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            {t('documents.actions.addPhotos')}
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => onRenew(type, document)}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              {isPaper(type) ? t('documents.actions.renew') : t('documents.actions.replace')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(type, document, version)}
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {t('common.edit')}
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ms-auto"
          onClick={() => onHistory(document)}
        >
          <History className="h-4 w-4" aria-hidden />
          {t('documents.actions.history')}
          {versionCount > 1 ? (
            <Badge variant="secondary" className="px-1.5 tabular-nums">
              {versionCount}
            </Badge>
          ) : null}
        </Button>
      </footer>
    </article>
  );
}
