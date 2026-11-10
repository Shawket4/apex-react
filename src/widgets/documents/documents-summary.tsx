import * as React from 'react';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { formatCairoDate } from '@/shared/lib/cairo';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  ownerEntries,
  summariseEntries,
  type DocumentEntry,
} from '@/entities/document/entries';
import { useDocumentCatalogue, useOwnerDocuments } from '@/entities/document/queries';
import type { OwnerKind } from '@/entities/document/schemas';
import { currentVersion, documentStatus } from '@/entities/document/status';
import { documentName, isPaper } from './labels';
import { DocumentStatusBadge } from './status-badge';
import { documentTypeIcon } from './type-icon';

interface DocumentsSummaryProps {
  ownerKind: OwnerKind;
  ownerId: number | string;
  /** A car's type, for the papers only some vehicles carry (a tank licence). */
  carType?: string | null;
  /** Takes the reader to the documents themselves. */
  onOpen: () => void;
  className?: string;
}

/**
 * Where an owner's documents stand, at a glance: one line per document with
 * its expiry and status. The same card on a car's and a driver's overview,
 * reading the same catalogue as the documents panel, so a type added there
 * shows up here with nothing to change.
 */
export function DocumentsSummary({
  ownerKind,
  ownerId,
  carType,
  onOpen,
  className,
}: DocumentsSummaryProps) {
  const { t } = useTranslation();
  const catalogue = useDocumentCatalogue();
  const owned = useOwnerDocuments(ownerKind, ownerId);

  const types = catalogue.data?.types;
  const documents = owned.data;
  const entries = React.useMemo(
    () => (types && documents ? ownerEntries(types, documents, ownerKind, carType) : []),
    [types, documents, ownerKind, carType],
  );
  const summary = React.useMemo(() => summariseEntries(entries), [entries]);
  const loading = catalogue.isLoading || owned.isLoading;
  const failed = !loading && (!types || !documents);

  return (
    <Card className={className}>
      <CardHeader className="flex-row flex-wrap items-center gap-x-3 gap-y-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <FolderOpen className="h-4 w-4" aria-hidden />
          {t('documents.title')}
        </CardTitle>
        <div className="order-last flex basis-full flex-wrap items-center gap-1.5 empty:hidden sm:order-none sm:basis-auto">
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-my-1 ms-auto h-7 gap-1 px-2"
          onClick={onOpen}
        >
          {t('common.viewAll')}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[3.25rem] rounded-lg" />
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {t('documents.loadFailed')}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void catalogue.refetch();
                void owned.refetch();
              }}
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {entries.map((entry) => (
              <li key={entry.key} className="min-w-0">
                <SummaryRow entry={entry} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ entry, onOpen }: { entry: DocumentEntry; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  const { type, document } = entry;
  const Icon = documentTypeIcon(type.key);
  const version = document ? currentVersion(document) : null;
  const status = version ? documentStatus(version.expiry_date) : null;

  let detail: string;
  if (!version) {
    detail = document?.versions.length
      ? t('documents.card.allHidden')
      : t('documents.status.notAdded');
  } else if (version.expiry_date) {
    detail = t('documents.card.expires', {
      date: formatCairoDate(version.expiry_date, i18n.language),
    });
  } else if (isPaper(type)) {
    detail = t('documents.card.noExpiry');
  } else {
    detail = t('documents.card.photos', { count: version.files.length });
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !version && 'border-dashed',
        status === 'expired' && 'border-destructive/40 bg-destructive/10 hover:bg-destructive/15',
        status === 'expiring' && 'border-warning/40 bg-warning/10 hover:bg-warning/15',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-medium', !version && 'text-muted-foreground')} dir="auto">
          {documentName(t, type.key, document?.label)}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      {version?.expiry_date ? (
        <DocumentStatusBadge expiryDate={version.expiry_date} className="shrink-0" />
      ) : null}
    </button>
  );
}
