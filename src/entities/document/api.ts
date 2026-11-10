import { apiClient, apiGet } from '@/shared/api/client';
import {
  documentCatalogueSchema,
  documentFileSchema,
  documentsOverviewResponseSchema,
  ownerDocumentsResponseSchema,
  type DocumentCatalogue,
  type DocumentFile,
  type DocumentOverviewRow,
  type OwnerDocument,
  type OwnerKind,
  type SaveVersionPayload,
} from './schemas';

/** A phone on a weak signal sending a few megabytes outlasts the default 15 s. */
const UPLOAD_TIMEOUT = 180_000;
const FILE_TIMEOUT = 60_000;

export async function getDocumentCatalogue(): Promise<DocumentCatalogue> {
  return documentCatalogueSchema.parse(await apiGet<unknown>('/api/documents/types'));
}

export async function getOwnerDocuments(
  ownerKind: OwnerKind,
  ownerId: number | string,
): Promise<OwnerDocument[]> {
  const data = await apiGet<unknown>(`/api/documents/${ownerKind}/${ownerId}`);
  return ownerDocumentsResponseSchema.parse(data).documents;
}

export async function getDocumentsOverview(ownerKind: OwnerKind): Promise<DocumentOverviewRow[]> {
  const data = await apiGet<unknown>(`/api/documents/overview/${ownerKind}`);
  return documentsOverviewResponseSchema.parse(data).documents;
}

/**
 * Stage one file. It belongs to nothing until a save names it, so an upload
 * abandoned half-way through a form leaves no version behind.
 */
export async function uploadDocumentFile(
  file: Blob,
  name: string,
  options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<DocumentFile> {
  const body = new FormData();
  body.append('file', file, name);
  const response = await apiClient.post<unknown>('/api/documents/files', body, {
    // Named, or axios turns the form into JSON to match the client's default.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total) options.onProgress?.(event.loaded / event.total);
    },
  });
  return documentFileSchema.parse(response.data);
}

/**
 * A stored file, or its thumbnail. Served behind the session like everything
 * else, so it is fetched here and shown from an object URL: an <img src> would
 * go out without the bearer token.
 */
export async function getDocumentFileBlob(fileId: number, thumb: boolean): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/api/documents/files/${fileId}`, {
    params: thumb ? { thumb: 1 } : undefined,
    responseType: 'blob',
    timeout: FILE_TIMEOUT,
  });
  return response.data;
}

/** Every write answers with the owner's documents as they now stand. */
function documentsOf(data: unknown): OwnerDocument[] {
  return ownerDocumentsResponseSchema.parse(data).documents;
}

/** A new document, or (with `document_id`) a renewal of one. */
export async function createDocumentVersion(
  ownerKind: OwnerKind,
  ownerId: number | string,
  payload: SaveVersionPayload,
): Promise<OwnerDocument[]> {
  const response = await apiClient.post<unknown>(
    `/api/documents/${ownerKind}/${ownerId}/versions`,
    payload,
  );
  return documentsOf(response.data);
}

export async function updateDocumentVersion(
  versionId: number,
  payload: SaveVersionPayload,
): Promise<OwnerDocument[]> {
  const response = await apiClient.put<unknown>(`/api/documents/versions/${versionId}`, payload);
  return documentsOf(response.data);
}

/** Hide, not delete: the version stays in the history and can come back. */
export async function hideDocumentVersion(versionId: number): Promise<OwnerDocument[]> {
  const response = await apiClient.delete<unknown>(`/api/documents/versions/${versionId}`);
  return documentsOf(response.data);
}

export async function restoreDocumentVersion(versionId: number): Promise<OwnerDocument[]> {
  const response = await apiClient.post<unknown>(`/api/documents/versions/${versionId}/restore`);
  return documentsOf(response.data);
}
