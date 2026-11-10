import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@/shared/api/query';
import { QUERY_KEYS } from '@/shared/config/constants';
import { toast } from '@/shared/ui/toast';
import {
  createDocumentVersion,
  getDocumentCatalogue,
  getDocumentFileBlob,
  getDocumentsOverview,
  getOwnerDocuments,
  hideDocumentVersion,
  restoreDocumentVersion,
  updateDocumentVersion,
} from './api';
import { documentErrorMessage } from './errors';
import type { OwnerDocument, OwnerKind, SaveVersionPayload } from './schemas';

/** The catalogue changes with a deploy, not with use. */
const CATALOGUE_STALE = 60 * 60_000;

export function useDocumentCatalogue() {
  return useQuery({
    queryKey: QUERY_KEYS.documentTypes,
    queryFn: getDocumentCatalogue,
    staleTime: CATALOGUE_STALE,
  });
}

export function useOwnerDocuments(ownerKind: OwnerKind, ownerId: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.documents(ownerKind, ownerId ?? ''),
    queryFn: () => getOwnerDocuments(ownerKind, ownerId as number | string),
    enabled: ownerId !== undefined && ownerId !== '',
  });
}

export function useDocumentsOverview(ownerKind: OwnerKind) {
  return useQuery({
    queryKey: QUERY_KEYS.documentsOverview(ownerKind),
    queryFn: () => getDocumentsOverview(ownerKind),
    staleTime: 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Every write answers with the owner's documents, so the panel is updated from
 * the answer rather than refetched. What else reads a document's dates is
 * marked stale: the fleet overview, and the owner's own row — the server
 * mirrors a current expiry date onto the car or driver, which is what the cars
 * table and the driver's overview show.
 */
function settle(ownerKind: OwnerKind, ownerId: number | string, documents: OwnerDocument[]): void {
  queryClient.setQueryData(QUERY_KEYS.documents(ownerKind, ownerId), documents);
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documentsOverview(ownerKind) });
  void queryClient.invalidateQueries({
    queryKey: ownerKind === 'car' ? QUERY_KEYS.cars : QUERY_KEYS.drivers,
  });
}

export interface SaveVersionInput {
  /** Set to change an existing version; left out, the save adds one. */
  versionId?: number;
  payload: SaveVersionPayload;
}

export function useSaveDocumentVersion(ownerKind: OwnerKind, ownerId: number | string) {
  const { t } = useTranslation();
  return useMutation({
    mutationKey: ['documents', 'save'],
    mutationFn: ({ versionId, payload }: SaveVersionInput) =>
      versionId === undefined
        ? createDocumentVersion(ownerKind, ownerId, payload)
        : updateDocumentVersion(versionId, payload),
    onSuccess: (documents) => {
      settle(ownerKind, ownerId, documents);
      toast.success(t('documents.toast.saved'));
    },
    // No toast: the form that sent it shows the reason next to its fields.
  });
}

export function useHideDocumentVersion(ownerKind: OwnerKind, ownerId: number | string) {
  const { t } = useTranslation();
  return useMutation({
    mutationKey: ['documents', 'hide'],
    mutationFn: (versionId: number) => hideDocumentVersion(versionId),
    onSuccess: (documents) => {
      settle(ownerKind, ownerId, documents);
      toast.success(t('documents.toast.hidden'));
    },
    onError: (error) => toast.error(documentErrorMessage(error, t)),
  });
}

export function useRestoreDocumentVersion(ownerKind: OwnerKind, ownerId: number | string) {
  const { t } = useTranslation();
  return useMutation({
    mutationKey: ['documents', 'restore'],
    mutationFn: (versionId: number) => restoreDocumentVersion(versionId),
    onSuccess: (documents) => {
      settle(ownerKind, ownerId, documents);
      toast.success(t('documents.toast.restored'));
    },
    onError: (error) => toast.error(documentErrorMessage(error, t)),
  });
}

/* -------------------------------------------------------------------------- */
/* Files                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A stored file as an object URL an <img> can show.
 *
 * A file never changes once stored (a replacement is a new file, with a new
 * id), so the URL is good for as long as it is cached. The cache owns the URL:
 * when an entry is collected its URL is revoked below, which is why nothing
 * that uses this hook revokes anything.
 */
export function useDocumentFileUrl(
  fileId: number | undefined,
  options: { thumb?: boolean; enabled?: boolean } = {},
) {
  const thumb = options.thumb ?? false;
  return useQuery({
    queryKey: QUERY_KEYS.documentFile(fileId ?? 0, thumb),
    queryFn: async () => URL.createObjectURL(await getDocumentFileBlob(fileId as number, thumb)),
    enabled: fileId !== undefined && (options.enabled ?? true),
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

const FILE_KEY = QUERY_KEYS.documentFile(0, false)[0];

queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'removed' || event.query.queryKey[0] !== FILE_KEY) return;
  const url = event.query.state.data;
  if (typeof url === 'string') URL.revokeObjectURL(url);
});

/* -------------------------------------------------------------------------- */
/* Intent prefetch — mirrors the hooks above key-for-key.                      */
/* -------------------------------------------------------------------------- */

export function prefetchDocumentCatalogue(qc: QueryClient): void {
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.documentTypes,
    queryFn: getDocumentCatalogue,
    staleTime: CATALOGUE_STALE,
  });
}

export function prefetchOwnerDocuments(
  qc: QueryClient,
  ownerKind: OwnerKind,
  ownerId: number | string,
): void {
  void qc.prefetchQuery({
    queryKey: QUERY_KEYS.documents(ownerKind, ownerId),
    queryFn: () => getOwnerDocuments(ownerKind, ownerId),
  });
}

export function prefetchDocumentsOverview(qc: QueryClient): void {
  for (const kind of ['car', 'driver'] as const) {
    void qc.prefetchQuery({
      queryKey: QUERY_KEYS.documentsOverview(kind),
      queryFn: () => getDocumentsOverview(kind),
      staleTime: 60_000,
    });
  }
}
