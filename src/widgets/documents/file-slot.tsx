import * as React from 'react';
import { Camera, CircleAlert, FileText, ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { useDocumentFileUrl } from '@/entities/document/queries';
import type { DraftFile } from './use-draft-files';

interface FileSlotProps {
  /** What goes here, as the add tile says it: "Add front", "Add pages". */
  addLabel: string;
  /** Caption under each tile ("Front"); left out where the tiles need none. */
  caption?: string;
  files: DraftFile[];
  max: number;
  /** The `accept` of the file input. */
  accept: string;
  /** Offer the camera as its own button (phones). */
  camera?: boolean;
  disabled?: boolean;
  /** Tile proportions: a card is wide, a page is tall. */
  tileClassName: string;
  /** The grid the tiles sit in. */
  className?: string;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
}

/**
 * One slot of a version: its files as tiles, and — while there is room — a
 * tile that takes more, by click, by drop or from the camera.
 */
export function FileSlot({
  addLabel,
  caption,
  files,
  max,
  accept,
  camera,
  disabled,
  tileClassName,
  className,
  onAdd,
  onRemove,
}: FileSlotProps) {
  const { t } = useTranslation();
  const picker = React.useRef<HTMLInputElement>(null);
  const shutter = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const multiple = max > 1;
  const room = files.length < max;
  // A slot that holds one keeps its add tile hidden once filled, and takes a
  // dropped file as the replacement.
  const single = max === 1;

  const take = (list: FileList | null) => {
    if (list && list.length > 0) onAdd(Array.from(list));
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (!disabled) take(event.dataTransfer.files);
  };
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) setOver(true);
  };

  return (
    <div className="min-w-0 space-y-2">
      <div
        className={className}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setOver(false)}
      >
        {files.map((file) => (
          <DraftTile
            key={file.key}
            file={file}
            caption={caption}
            className={tileClassName}
            highlighted={over && single}
            disabled={disabled}
            onRemove={() => onRemove(file.key)}
          />
        ))}
        {room ? (
          <div className="min-w-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => picker.current?.click()}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-2 text-center text-muted-foreground transition-colors',
                'hover:border-primary/60 hover:bg-accent/40 hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                over && 'border-primary bg-primary/5 text-foreground',
                tileClassName,
              )}
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="text-xs font-medium">{addLabel}</span>
            </button>
            {caption ? (
              <p className="mt-1 truncate text-center text-xs text-muted-foreground">{caption}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {camera && (room || single) ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled}
          onClick={() => shutter.current?.click()}
        >
          <Camera className="h-4 w-4" aria-hidden />
          {caption
            ? t('documents.editor.takePhotoOf', { slot: caption })
            : t('documents.editor.takePhoto')}
        </Button>
      ) : null}

      <input
        ref={picker}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          take(event.target.files);
          // The same file chosen twice in a row is still a choice.
          event.target.value = '';
        }}
      />
      {camera ? (
        <input
          ref={shutter}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            take(event.target.files);
            event.target.value = '';
          }}
        />
      ) : null}
    </div>
  );
}

interface DraftTileProps {
  file: DraftFile;
  caption?: string;
  className: string;
  highlighted: boolean;
  disabled?: boolean;
  onRemove: () => void;
}

function DraftTile({ file, caption, className, highlighted, disabled, onRemove }: DraftTileProps) {
  const { t } = useTranslation();
  // A file stored before this form opened has no local preview; its thumbnail
  // comes from the server.
  const stored = file.stored;
  const { data: thumbUrl } = useDocumentFileUrl(stored?.id, {
    thumb: true,
    enabled: !file.previewUrl && !!stored?.has_thumb,
  });
  const picture = file.previewUrl ?? thumbUrl;
  const percent = Math.round(file.progress * 100);

  return (
    <div className="min-w-0">
      <div
        className={cn(
          'relative flex w-full items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground',
          highlighted && 'border-primary',
          file.status === 'failed' && 'border-destructive',
          className,
        )}
      >
        {picture ? (
          <img src={picture} alt={caption ?? file.name} className="h-full w-full object-cover" />
        ) : file.image ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <span className="flex flex-col items-center gap-1 px-2">
            <FileText className="h-6 w-6" aria-hidden />
            <span className="line-clamp-2 break-all text-[11px] leading-tight" dir="auto">
              {file.name}
            </span>
          </span>
        )}

        {file.status === 'uploading' ? (
          <div
            className="absolute inset-x-0 bottom-0 bg-background/90 px-2 py-1.5"
            role="status"
            aria-label={t('documents.editor.uploadingPercent', { percent })}
          >
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left rounded-full bg-primary transition-transform duration-fast rtl:origin-right"
                style={{ transform: `scaleX(${file.progress})` }}
              />
            </div>
            <p className="mt-1 text-center text-[11px] tabular-nums text-foreground">
              {t('documents.editor.uploadingPercent', { percent })}
            </p>
          </div>
        ) : null}

        {file.status === 'failed' ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/90 p-2 text-center text-destructive"
            role="alert"
          >
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
            <span className="line-clamp-3 text-[11px] leading-tight">{file.error}</span>
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={t('documents.editor.removeFile', { name: caption ?? file.name })}
          className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {caption ? (
        <p className="mt-1 truncate text-center text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}
