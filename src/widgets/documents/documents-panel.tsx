import * as React from 'react';
import { FileWarning, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PERMISSION_LEVELS } from '@/shared/config/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { useDocumentCatalogue, useOwnerDocuments } from '@/entities/document/queries';
import type {
  DocumentFile,
  DocumentType,
  DocumentVersion,
  OwnerDocument,
  OwnerKind,
} from '@/entities/document/schemas';
import { ownerEntries, summariseEntries, type DocumentEntry } from '@/entities/document/entries';
import { DocumentCard } from './document-card';
import { DocumentEditor, type EditorTarget } from './document-editor';
import { DocumentHistory, type HistoryTarget } from './document-history';
import { DocumentViewer, type ViewerTarget } from './document-viewer';
import { documentName, documentTypeName, slotName } from './labels';
import { documentTypeIcon } from './type-icon';

interface DocumentsPanelProps {
  ownerKind: OwnerKind;
  ownerId: number | string;
  /** A car's type, for the papers only some vehicles carry (a tank licence). */
  carType?: string | null;
}

/**
 * Everything an owner carries, as one card per document.
 *
 * The same panel for a car and a driver, and for any owner added later: which
 * cards appear, what each holds and who may change them all come from the
 * catalogue, so nothing here names a licence or a photo.
 */
export function DocumentsPanel({ ownerKind, ownerId, carType }: DocumentsPanelProps) {
  const { t } = useTranslation();
  const { atLeast } = usePermissions();
  const canManage = atLeast(PERMISSION_LEVELS.MANAGER);

  const catalogue = useDocumentCatalogue();
  const owned = useOwnerDocuments(ownerKind, ownerId);

  const [editor, setEditor] = React.useState<EditorTarget | null>(null);
  const [historyId, setHistoryId] = React.useState<number | null>(null);
  const [viewer, setViewer] = React.useState<ViewerTarget | null>(null);
  const session = React.useRef(0);

  const types = catalogue.data?.types;
  const documents = owned.data;

  const entries = React.useMemo(
    () => (types && documents ? ownerEntries(types, documents, ownerKind, carType) : []),
    [types, documents, ownerKind, carType],
  );
  const summary = React.useMemo(() => summariseEntries(entries), [entries]);

  // The history sheet follows the live document, so a version hidden or
  // restored from inside it shows the change without being reopened.
  const historyTarget = React.useMemo<HistoryTarget | null>(() => {
    if (historyId === null) return null;
    const entry = entries.find((e) => e.document?.id === historyId);
    return entry?.document ? { type: entry.type, document: entry.document } : null;
  }, [entries, historyId]);

  const open = (target: Omit<EditorTarget, 'session'>) => {
    session.current += 1;
    setEditor({ ...target, session: session.current });
  };

  const openFiles = (
    type: DocumentType,
    document: OwnerDocument,
    files: DocumentFile[],
    index: number,
  ) => {
    if (document.restricted) return;
    setViewer({
      title: documentName(t, type.key, document.label),
      files,
      index,
      captions:
        type.layout === 'sides' ? files.map((file) => slotName(t, file.slot)) : undefined,
    });
  };

  const actions = {
    onAdd: (type: DocumentType) => open({ mode: 'add', type }),
    onRenew: (type: DocumentType, document: OwnerDocument) =>
      open({ mode: 'renew', type, document }),
    onEdit: (type: DocumentType, document: OwnerDocument, version: DocumentVersion) =>
      open({ mode: 'edit', type, document, version }),
    onHistory: (document: OwnerDocument) => setHistoryId(document.id),
    onOpenFiles: openFiles,
  };

  if (catalogue.isLoading || owned.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!catalogue.data || !documents) {
    return (
      <EmptyState
        icon={<FileWarning className="h-8 w-8 text-muted-foreground" aria-hidden />}
        title={t('documents.loadFailed')}
        action={
          <Button
            variant="outline"
            onClick={() => {
              void catalogue.refetch();
              void owned.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  // The types an owner holds several of get an "add another" after their cards.
  const addable = canManage
    ? catalogue.data.types.filter(
        (type) =>
          type.owner_kind === ownerKind &&
          type.multiple &&
          entries.some((e) => e.type.key === type.key && e.document),
      )
    : [];

  return (
    <section className="space-y-3" aria-label={t('documents.title')}>
      {summary.expired + summary.expiring + summary.missing > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {summary.expired > 0 ? (
            <Badge variant="destructive">
              {t('documents.summary.expired', { count: summary.expired })}
            </Badge>
          ) : null}
          {summary.expiring > 0 ? (
            <Badge variant="warning">
              {t('documents.summary.expiring', { count: summary.expiring })}
            </Badge>
          ) : null}
          {summary.missing > 0 ? (
            <Badge variant="outline">
              {t('documents.summary.missing', { count: summary.missing })}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <React.Fragment key={entry.key}>
            <DocumentCard
              type={entry.type}
              document={entry.document}
              canManage={canManage}
              {...actions}
            />
            {isLastOf(entries, entry) && addable.includes(entry.type) ? (
              <AddAnother type={entry.type} onAdd={() => actions.onAdd(entry.type)} />
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <DocumentEditor
        ownerKind={ownerKind}
        ownerId={ownerId}
        catalogue={catalogue.data}
        target={editor}
        onClose={() => setEditor(null)}
      />
      <DocumentHistory
        ownerKind={ownerKind}
        ownerId={ownerId}
        target={historyTarget}
        canManage={canManage}
        onClose={() => setHistoryId(null)}
        onEdit={actions.onEdit}
        onOpenFiles={openFiles}
      />
      <DocumentViewer target={viewer} onClose={() => setViewer(null)} />
    </section>
  );
}

/** Whether this entry is the last card of its type. */
function isLastOf(entries: DocumentEntry[], entry: DocumentEntry): boolean {
  const index = entries.indexOf(entry);
  return entries[index + 1]?.type.key !== entry.type.key;
}

function AddAnother({ type, onAdd }: { type: DocumentType; onAdd: () => void }) {
  const { t } = useTranslation();
  const Icon = documentTypeIcon(type.key);
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/50 p-4 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex items-center gap-1.5">
        <Plus className="h-4 w-4" aria-hidden />
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {t('documents.actions.addAnother', { type: documentTypeName(t, type.key) })}
    </button>
  );
}
