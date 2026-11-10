import { z } from 'zod';

/**
 * Documents: the papers and photos a car or a driver carries.
 *
 * One model for every owner and every kind of paper (FalconGo, package
 * `documents`): an owner holds documents, a document is one type (and, for the
 * types an owner holds several of, one label), a renewal is a new version, and
 * a version holds dates, a note and files. Nothing here knows a licence from a
 * photo: what a type holds comes from the catalogue the server sends, and its
 * name from the translation files (`documents.types.<key>`).
 */

export const OWNER_KINDS = ['car', 'driver'] as const;
export type OwnerKind = (typeof OWNER_KINDS)[number];

/** How a type's files are arranged, which is all the screen needs to know. */
export const DOCUMENT_LAYOUTS = ['sides', 'pages', 'photo', 'album'] as const;
export type DocumentLayout = (typeof DOCUMENT_LAYOUTS)[number];

export const documentSlotSchema = z.object({
  key: z.string(),
  max: z.number(),
});
export type DocumentSlot = z.infer<typeof documentSlotSchema>;

export const documentTypeSchema = z.object({
  key: z.string(),
  owner_kind: z.string(),
  layout: z.string(),
  slots: z.array(documentSlotSchema),
  /** An owner holds several, told apart by a label (a site pass per company). */
  multiple: z.boolean().optional().default(false),
  /** Files are served to managers and above only. */
  sensitive: z.boolean().optional().default(false),
  /** Pictures only; every other type also takes a PDF. */
  images_only: z.boolean().optional().default(false),
  /** The car types this paper applies to; absent means every car. */
  car_types: z.array(z.string()).optional().nullable(),
});
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const documentCatalogueSchema = z.object({
  types: z.array(documentTypeSchema),
  content_types: z.array(z.string()),
  max_file_bytes: z.number(),
});
export type DocumentCatalogue = z.infer<typeof documentCatalogueSchema>;

export const documentFileSchema = z.object({
  id: z.number(),
  slot: z.string(),
  position: z.number().optional().default(0),
  original_name: z.string().optional().default(''),
  content_type: z.string(),
  size: z.number().optional().default(0),
  has_thumb: z.boolean().optional().default(false),
  created_at: z.string().optional().nullable(),
});
export type DocumentFile = z.infer<typeof documentFileSchema>;

export const documentVersionSchema = z.object({
  id: z.number(),
  /** `YYYY-MM-DD`, or null when the paper carries no such date. */
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  note: z.string().optional().default(''),
  /** `upload`, or where an imported version came from: `profile` | `legacy`. */
  source: z.string().optional().default('upload'),
  created_by_name: z.string().optional().default(''),
  created_at: z.string(),
  updated_by_name: z.string().optional().default(''),
  updated_at: z.string().nullable().optional(),
  hidden: z.boolean().optional().default(false),
  hidden_by_name: z.string().optional().default(''),
  hidden_at: z.string().nullable().optional(),
  files: z.array(documentFileSchema).nullable().optional().transform((f) => f ?? []),
});
export type DocumentVersion = z.infer<typeof documentVersionSchema>;

export const ownerDocumentSchema = z.object({
  id: z.number(),
  type_key: z.string(),
  label: z.string().optional().default(''),
  /** The visible version with the highest id; null when all are hidden. */
  current_version_id: z.number().nullable().optional(),
  /** The files are there, and this account may not open them. */
  restricted: z.boolean().optional().default(false),
  /** Newest first. Hidden ones are only sent to managers. */
  versions: z.array(documentVersionSchema).nullable().optional().transform((v) => v ?? []),
});
export type OwnerDocument = z.infer<typeof ownerDocumentSchema>;

export const ownerDocumentsResponseSchema = z.object({
  documents: z.array(ownerDocumentSchema).nullable().optional().transform((d) => d ?? []),
});

export const documentOverviewRowSchema = z.object({
  document_id: z.number(),
  owner_id: z.number(),
  type_key: z.string(),
  label: z.string().optional().default(''),
  version_id: z.number(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  file_count: z.number().optional().default(0),
});
export type DocumentOverviewRow = z.infer<typeof documentOverviewRowSchema>;

export const documentsOverviewResponseSchema = z.object({
  documents: z.array(documentOverviewRowSchema).nullable().optional().transform((d) => d ?? []),
});

/** One file of a version being saved: an uploaded file and where it goes. */
export interface VersionFileRef {
  id: number;
  slot: string;
}

/**
 * What a save sends. A new document names its type (and label); a renewal
 * names the document. `files` left out of an edit keeps the files as they are;
 * a list is the complete new set.
 */
export interface SaveVersionPayload {
  document_id?: number;
  type_key?: string;
  label?: string;
  issue_date: string;
  expiry_date: string;
  note: string;
  files?: VersionFileRef[];
}
