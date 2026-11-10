import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { uploadDocumentFile } from '@/entities/document/api';
import { documentErrorMessage } from '@/entities/document/errors';
import type {
  DocumentCatalogue,
  DocumentFile,
  DocumentType,
  VersionFileRef,
} from '@/entities/document/schemas';
import { isImage } from '@/entities/document/status';
import { downscaleImage } from '@/shared/lib/downscale-image';
import { toast } from '@/shared/ui/toast';

/** A file in the form: already stored, on its way up, or refused. */
export interface DraftFile {
  /** Stable for the life of the form; a stored file's is its id. */
  key: string;
  slot: string;
  name: string;
  image: boolean;
  status: 'stored' | 'uploading' | 'failed';
  /** 0–1 while uploading. */
  progress: number;
  stored?: DocumentFile;
  /** Shown for a picture chosen in this form, before the server has a thumbnail. */
  previewUrl?: string;
  /** Why it failed, in the reader's language. */
  error?: string;
}

function fromStored(file: DocumentFile): DraftFile {
  return {
    key: `stored-${file.id}`,
    slot: file.slot,
    name: file.original_name,
    image: isImage(file.content_type),
    status: 'stored',
    progress: 1,
    stored: file,
  };
}

let sequence = 0;

/**
 * The files of a version being written.
 *
 * A chosen file is sent straight away and staged on the server, so by the time
 * the form is saved there is nothing left to wait for and the save names file
 * ids. What the server would refuse anyway (a type it does not take, a file
 * over the limit, one more than the slot holds) is refused here first, in the
 * same words, without spending the upload.
 */
export function useDraftFiles(
  type: DocumentType,
  catalogue: DocumentCatalogue,
  initial: DocumentFile[],
) {
  const { t } = useTranslation();
  const [files, setFiles] = React.useState<DraftFile[]>(() => initial.map(fromStored));

  // The latest list for the async paths: a slot's room is judged when a file
  // is chosen, not when this render happened.
  const latest = React.useRef(files);
  latest.current = files;
  const controllers = React.useRef(new Map<string, AbortController>());
  const previews = React.useRef(new Map<string, string>());

  React.useEffect(() => {
    const running = controllers.current;
    const urls = previews.current;
    return () => {
      running.forEach((c) => c.abort());
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const patch = React.useCallback((key: string, change: Partial<DraftFile>) => {
    setFiles((list) => list.map((f) => (f.key === key ? { ...f, ...change } : f)));
  }, []);

  const remove = React.useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
    const url = previews.current.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      previews.current.delete(key);
    }
    setFiles((list) => list.filter((f) => f.key !== key));
  }, []);

  const add = React.useCallback(
    async (slotKey: string, picked: File[]) => {
      const slot = type.slots.find((s) => s.key === slotKey);
      if (!slot || picked.length === 0) return;

      // A slot that holds one takes the new file in place of the old.
      if (slot.max === 1) {
        latest.current.filter((f) => f.slot === slotKey).forEach((f) => remove(f.key));
      }
      const held = slot.max === 1 ? 0 : latest.current.filter((f) => f.slot === slotKey).length;
      const room = Math.max(0, slot.max - held);
      if (picked.length > room) {
        toast.error(t('documents.errors.too_many_files'));
      }

      const imageTypes = catalogue.content_types.filter(isImage);
      for (const file of picked.slice(0, room)) {
        const prepared = await downscaleImage(file, { passthroughTypes: imageTypes });
        const contentType = prepared.blob.type;

        // An empty type is a browser that did not say; the server reads the bytes.
        if (contentType) {
          if (type.images_only && !isImage(contentType)) {
            toast.error(t('documents.errors.images_only'));
            continue;
          }
          if (!catalogue.content_types.includes(contentType)) {
            toast.error(t('documents.errors.unsupported_type'));
            continue;
          }
        }
        if (prepared.blob.size > catalogue.max_file_bytes) {
          toast.error(t('documents.errors.file_too_large'));
          continue;
        }

        const key = `draft-${++sequence}`;
        const image = isImage(contentType);
        let previewUrl: string | undefined;
        if (image) {
          previewUrl = URL.createObjectURL(prepared.blob);
          previews.current.set(key, previewUrl);
        }
        const controller = new AbortController();
        controllers.current.set(key, controller);

        setFiles((list) => [
          ...list,
          { key, slot: slotKey, name: prepared.name, image, status: 'uploading', progress: 0, previewUrl },
        ]);

        void uploadDocumentFile(prepared.blob, prepared.name, {
          signal: controller.signal,
          onProgress: (progress) => patch(key, { progress }),
        })
          .then((stored) => patch(key, { status: 'stored', progress: 1, stored }))
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            patch(key, { status: 'failed', error: documentErrorMessage(error, t) });
          })
          .finally(() => controllers.current.delete(key));
      }
    },
    [catalogue, patch, remove, t, type],
  );

  const uploading = files.some((f) => f.status === 'uploading');
  const failed = files.some((f) => f.status === 'failed');
  /** The complete set a save sends: stored files, in the order shown. */
  const refs: VersionFileRef[] = files.flatMap((f) =>
    f.stored ? [{ id: f.stored.id, slot: f.slot }] : [],
  );

  return { files, add, remove, uploading, failed, refs };
}
