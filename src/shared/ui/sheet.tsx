import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { composeRefs, recipes, useOverlayOpen, usePresence } from '@/shared/lib/motion';
import { Dialog } from './dialog';
import { CONTAINER_Z, STACKED_CONTAINER_Z } from './z-index';

/** A Dialog root: it holds the open state so the panel can slide out before it unmounts. */
const Sheet = Dialog;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      // No backdrop-blur. A blur over the whole viewport is recomputed every
      // frame while the panel slides, and on a phone that is the single most
      // expensive thing here — it was the stutter. A 50% black scrim separates
      // the layers just as well and costs nothing to animate.
      `fixed inset-0 ${CONTAINER_Z} bg-black/50`,
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

// The slide itself is the motion system's (recipes.sheet): 320 ms in on the
// drawer curve, which arrives quickly and settles, and 220 ms out on an
// accelerating one, because a panel leaving does not need to be watched.
// will-change-transform promotes the panel to its own layer up front, so the
// first frame of the slide is not also a layer-creation frame.
const sheetVariants = cva(`fixed ${CONTAINER_Z} gap-4 bg-background shadow-lg will-change-transform`, {
  variants: {
    side: {
      top: 'inset-x-0 top-0 border-b',
      bottom: 'inset-x-0 bottom-0 border-t',
      left: 'inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm',
      right: 'inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm',
    },
  },
  defaultVariants: { side: 'right' },
});

/** `left`/`right` are logical (start/end) here; the slide needs the physical edge. */
function physicalSide(side: 'top' | 'bottom' | 'left' | 'right'): recipes.Side {
  if (side === 'top' || side === 'bottom') return side;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return rtl ? (side === 'left' ? 'right' : 'left') : side;
}

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideCloseButton?: boolean;
  /** Renders overlay + panel above default sheets (nested pickers). */
  stacked?: boolean;
}

const STACKED_Z = STACKED_CONTAINER_Z;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, hideCloseButton = false, stacked = false, ...props }, ref) => {
  const { t } = useTranslation();
  const open = useOverlayOpen();
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const resolved = side ?? 'right';
  const mounted = usePresence(open ?? true, [
    [overlayRef, recipes.sheetBackdrop],
    [panelRef, recipes.sheet(physicalSide(resolved))],
  ]);
  if (!mounted) return null;
  const forceMount = open === null ? undefined : true;
  return (
  <SheetPortal forceMount={forceMount}>
    <SheetOverlay ref={overlayRef} forceMount={forceMount} className={stacked ? STACKED_Z : undefined} />
    <DialogPrimitive.Content
      ref={composeRefs(panelRef, ref)}
      forceMount={forceMount}
      className={cn(sheetVariants({ side: resolved }), stacked && STACKED_Z, className)}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.close')}</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Radix requires a Title inside Content for the dialog to be announced; without
 * one it warns and screen readers get an unnamed dialog. Callers that show no
 * visible heading should still render one and hide it with `sr-only`.
 */
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetPortal,
  SheetOverlay,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
