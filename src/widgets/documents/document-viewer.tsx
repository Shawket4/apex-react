import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImageOff,
  Loader2,
  Maximize,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { useLastPresent } from '@/shared/hooks/use-last-present';
import { useDocumentFileUrl } from '@/entities/document/queries';
import type { DocumentFile } from '@/entities/document/schemas';
import { isImage } from '@/entities/document/status';

/** What the viewer is showing: a set of files and the one in front. */
export interface ViewerTarget {
  /** The document's name, for the heading. */
  title: string;
  files: DocumentFile[];
  index: number;
  /** A caption per file ("Front"), where the layout has them. */
  captions?: Array<string | undefined>;
}

interface DocumentViewerProps {
  target: ViewerTarget | null;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

interface View {
  zoom: number;
  /** Quarter turns, clockwise. */
  turns: number;
  x: number;
  y: number;
}

const REST: View = { zoom: 1, turns: 0, x: 0, y: 0 };

/**
 * A document's files, full size: zoom, turn, drag to move, step to the next,
 * save a copy. A PDF is shown by the browser's own reader.
 */
export function DocumentViewer({ target, onClose }: DocumentViewerProps) {
  const shown = useLastPresent(target);

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        stacked
        className="flex h-[92vh] max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0"
      >
        {shown ? <ViewerBody key={shown.files.map((f) => f.id).join('-')} target={shown} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ViewerBody({ target }: { target: ViewerTarget }) {
  const { t } = useTranslation();
  const [index, setIndex] = React.useState(target.index);
  const [view, setView] = React.useState<View>(REST);
  const file = target.files[index] ?? target.files[0];
  const caption = target.captions?.[index];
  const picture = !!file && isImage(file.content_type);
  const { data: url, isError } = useDocumentFileUrl(file?.id);
  const many = target.files.length > 1;

  const go = React.useCallback(
    (step: number) => {
      const count = target.files.length;
      setIndex((i) => (i + step + count) % count);
      setView(REST);
    },
    [target.files.length],
  );

  const zoomBy = (factor: number) =>
    setView((v) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      // Back at rest the picture is centred again, wherever it was dragged.
      return zoom === MIN_ZOOM ? { ...v, zoom, x: 0, y: 0 } : { ...v, zoom };
    });

  // Drag to move, once zoomed in.
  const drag = React.useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (view.zoom === MIN_ZOOM) return;
    // Capturing the pointer would take the click away from previous / next.
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX - view.x, y: event.clientY - view.y };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    setView((v) => ({ ...v, x: event.clientX - start.x, y: event.clientY - start.y }));
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === '+' || event.key === '=') zoomBy(1.5);
    else if (event.key === '-') zoomBy(1 / 1.5);
    else if (many && event.key === 'ArrowRight') go(document.dir === 'rtl' ? -1 : 1);
    else if (many && event.key === 'ArrowLeft') go(document.dir === 'rtl' ? 1 : -1);
  };

  const download = () => {
    if (!url || !file) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = file.original_name || `document-${file.id}`;
    link.click();
  };

  if (!file) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <header className="flex items-center gap-3 border-b py-3 pe-12 ps-4">
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-base" dir="auto">
            {target.title}
          </DialogTitle>
          <DialogDescription className="truncate text-xs">
            {[caption, many ? t('documents.viewer.position', { index: index + 1, count: target.files.length }) : null]
              .filter(Boolean)
              .join(' · ') || file.original_name}
          </DialogDescription>
        </div>
      </header>

      <div
        className={cn(
          // A size container, so a picture turned on its side can be fitted
          // to the frame's other dimension (cqw/cqh below).
          'relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-muted/50 [container-type:size]',
          picture && view.zoom > MIN_ZOOM && 'cursor-grab active:cursor-grabbing',
        )}
        onPointerDown={picture ? onPointerDown : undefined}
        onPointerMove={picture ? onPointerMove : undefined}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={picture ? () => (view.zoom === MIN_ZOOM ? zoomBy(2.5) : setView(REST)) : undefined}
        onWheel={picture ? (event) => zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15) : undefined}
      >
        {isError ? (
          <p className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6" aria-hidden />
            {t('documents.viewer.failed')}
          </p>
        ) : !url ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        ) : picture ? (
          <img
            src={url}
            alt={caption ?? file.original_name}
            draggable={false}
            className={cn(
              'object-contain',
              view.turns % 2 === 0 ? 'max-h-full max-w-full' : 'max-h-[100cqw] max-w-[100cqh]',
            )}
            style={{
              transform: `translate(${view.x}px, ${view.y}px) rotate(${view.turns * 90}deg) scale(${view.zoom})`,
            }}
          />
        ) : (
          <object data={url} type={file.content_type} className="h-full w-full" aria-label={file.original_name}>
            <p className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8" aria-hidden />
              {t('documents.viewer.noPreview')}
              <Button type="button" size="sm" onClick={download}>
                <Download className="h-4 w-4" aria-hidden />
                {t('documents.actions.download')}
              </Button>
            </p>
          </object>
        )}

        {many ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full shadow"
              aria-label={t('common.previous')}
              onClick={() => go(-1)}
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full shadow"
              aria-label={t('common.next')}
              onClick={() => go(1)}
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
            </Button>
          </>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-1 border-t p-2">
        {picture ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('documents.actions.zoomOut')}
              disabled={view.zoom <= MIN_ZOOM}
              onClick={() => zoomBy(1 / 1.5)}
            >
              <ZoomOut className="h-4 w-4" aria-hidden />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(view.zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('documents.actions.zoomIn')}
              disabled={view.zoom >= MAX_ZOOM}
              onClick={() => zoomBy(1.5)}
            >
              <ZoomIn className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('documents.actions.rotate')}
              onClick={() => setView((v) => ({ ...v, turns: v.turns + 1 }))}
            >
              <RotateCw className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('documents.actions.resetView')}
              onClick={() => setView(REST)}
            >
              <Maximize className="h-4 w-4" aria-hidden />
            </Button>
          </>
        ) : null}
        <Button type="button" variant="ghost" size="sm" disabled={!url} onClick={download}>
          <Download className="h-4 w-4" aria-hidden />
          {t('documents.actions.download')}
        </Button>
      </footer>
    </div>
  );
}
