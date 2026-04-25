import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { useParentContainers } from '@/entities/trip/queries';
import { type ReceiptImage } from '@/entities/trip/schemas';
import { receiptBatchApi } from '@/entities/receipt-batch/api';
import { cn } from '@/shared/lib/cn';

interface TripReceiptBatchDialogProps {
  parentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Image gallery for a parent trip's receipt batch.
 *
 * The driver app uploads scanned receipt images that get attached to a parent
 * trip. This dialog lets office staff browse them: thumbnails grid + a
 * lightbox-style enlarged view. Click a thumbnail → enlarged. Arrow keys
 * navigate. Click outside / X / Escape closes the lightbox.
 *
 * The image URL is built from `VITE_API_BASE_URL` + the image's `path` via
 * `receiptBatchApi.imageUrl`. Adjust the env var if your project uses a
 * different one.
 */
export function TripReceiptBatchDialog({
  parentId,
  open,
  onOpenChange,
}: TripReceiptBatchDialogProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useParentContainers(open ? parentId : null);
  const [enlargedIndex, setEnlargedIndex] = React.useState<number | null>(null);

  const images = data?.parent_trip?.receipt_batch?.receipts ?? [];

  // Reset enlarged index when dialog opens / parent changes
  React.useEffect(() => {
    if (!open) setEnlargedIndex(null);
  }, [open, parentId]);

  // Keyboard nav for the lightbox
  React.useEffect(() => {
    if (enlargedIndex == null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedIndex(null);
      } else if (e.key === 'ArrowRight') {
        setEnlargedIndex((i) =>
          i != null ? (i + 1) % images.length : 0,
        );
      } else if (e.key === 'ArrowLeft') {
        setEnlargedIndex((i) =>
          i != null ? (i - 1 + images.length) % images.length : 0,
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enlargedIndex, images.length]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('trips.receiptBatch.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('trips.receiptBatch.dialogDescription', {
                count: images.length,
              })}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <ImageOff className="h-8 w-8" />
              {t('trips.receiptBatch.noImages')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image: ReceiptImage, idx: number) => (
                <button
                  key={image.ID ?? idx}
                  type="button"
                  onClick={() => setEnlargedIndex(idx)}
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted/30 transition-all hover:ring-2 hover:ring-primary"
                >
                  <img
                    src={receiptBatchApi.imageUrl(image.image_path)}
                    alt={t('trips.receiptBatch.imageAlt', { n: idx + 1 })}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute bottom-1 end-1 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {idx + 1} / {images.length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {enlargedIndex != null && images[enlargedIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setEnlargedIndex(null)}
        >
          <button
            type="button"
            onClick={() => setEnlargedIndex(null)}
            className="absolute end-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/20 text-white backdrop-blur-sm transition-colors hover:bg-card/30"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedIndex(
                    (enlargedIndex - 1 + images.length) % images.length,
                  );
                }}
                className={cn(
                  'absolute start-4 h-12 w-12 rounded-full bg-card/20 text-white backdrop-blur-sm hover:bg-card/30',
                )}
                aria-label={t('trips.pagination.previousPage')}
              >
                <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedIndex((enlargedIndex + 1) % images.length);
                }}
                className="absolute end-4 h-12 w-12 rounded-full bg-card/20 text-white backdrop-blur-sm hover:bg-card/30"
                aria-label={t('trips.pagination.nextPage')}
              >
                <ChevronRight className="h-6 w-6 rtl:rotate-180" />
              </Button>
            </>
          )}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={receiptBatchApi.imageUrl(images[enlargedIndex].image_path)}
              alt={t('trips.receiptBatch.imageAlt', { n: enlargedIndex + 1 })}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            <div className="absolute bottom-2 start-1/2 -translate-x-1/2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium tabular-nums backdrop-blur-sm">
              {enlargedIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
