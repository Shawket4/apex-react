import { FileText, ImageOff, Loader2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { useDocumentFileUrl } from '@/entities/document/queries';
import { isImage } from '@/entities/document/status';
import type { DocumentFile } from '@/entities/document/schemas';

interface Props {
  file: DocumentFile;
  /** The files are there and this account may not open them. */
  restricted?: boolean;
  /** Small caption under the picture: "Front", "Back". */
  caption?: string;
  onOpen?: () => void;
  className?: string;
}

/**
 * One stored file as a tile: the picture's thumbnail, or a PDF's name. A tile
 * that can be opened is a button; a restricted one says why it cannot.
 */
export function FileThumb({ file, restricted, caption, onOpen, className }: Props) {
  const { t } = useTranslation();
  const picture = isImage(file.content_type) && file.has_thumb && !restricted;
  const { data: url, isError } = useDocumentFileUrl(file.id, { thumb: true, enabled: picture });

  let body: React.ReactNode;
  if (restricted) {
    body = <Lock className="h-5 w-5" aria-hidden />;
  } else if (!picture) {
    body = (
      <span className="flex flex-col items-center gap-1 px-2">
        <FileText className="h-6 w-6" aria-hidden />
        <span className="line-clamp-2 break-all text-[11px] leading-tight" dir="auto">
          {file.original_name || t('documents.file')}
        </span>
      </span>
    );
  } else if (isError) {
    body = <ImageOff className="h-5 w-5" aria-hidden />;
  } else if (!url) {
    body = <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
  } else {
    body = (
      <img
        src={url}
        alt={caption ?? file.original_name}
        className="h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  const frame = cn(
    'relative flex w-full items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground',
    className,
  );
  const label = restricted
    ? t('documents.restricted')
    : t('documents.actions.open', { name: caption ?? file.original_name });

  return (
    <figure className="min-w-0">
      {onOpen && !restricted ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          className={cn(
            frame,
            'transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {body}
        </button>
      ) : (
        <div className={frame} title={restricted ? label : undefined}>
          {body}
        </div>
      )}
      {caption ? (
        <figcaption className="mt-1 truncate text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
