import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import {
  useComposedRefs,
  useElementRef,
  OverlayOpenProvider,
  recipes,
  useOverlayOpen,
  useOverlayRoot,
  usePresence,
} from '@/shared/lib/motion';
import { CONTAINER_Z } from './z-index';

/**
 * The Radix root, with its open state held here so the content can stay
 * mounted through its exit (see DialogContent). Sheet shares it.
 */
function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  const [isOpen, setOpen] = useOverlayRoot(open, defaultOpen, onOpenChange);
  return (
    <OverlayOpenProvider value={isOpen}>
      <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen} {...props} />
    </OverlayOpenProvider>
  );
}
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      `fixed inset-0 ${CONTAINER_Z} bg-black/50 backdrop-blur-sm`,
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Renders overlay + panel above stacked Sheets (STACKED_CONTAINER_Z) — confirms inside sheets. */
  stacked?: boolean;
}

const DIALOG_STACKED_Z = 'z-[10060]';

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, stacked = false, ...props }, ref) => {
  const { t } = useTranslation();
  const open = useOverlayOpen();
  // Elements as state: the portal mounts them a pass after this renders.
  const [overlayEl, overlayRef] = useElementRef<HTMLDivElement>();
  const [contentEl, contentRef] = useElementRef<HTMLDivElement>();
  const composed = useComposedRefs(contentRef, ref);
  const mounted = usePresence(open ?? true, [
    [overlayEl, recipes.backdrop],
    [contentEl, recipes.dialog],
  ]);
  if (!mounted) return null;
  // Outside our Dialog root, Radix mounts and unmounts on its own.
  const forceMount = open === null ? undefined : true;
  return (
    <DialogPortal forceMount={forceMount}>
      <DialogOverlay
        ref={overlayRef}
        forceMount={forceMount}
        className={stacked ? DIALOG_STACKED_Z : undefined}
      />
      <DialogPrimitive.Content
        ref={composed}
        forceMount={forceMount}
        className={cn(
          // w-[calc(100%-2rem)] + rounded: on phones a dialog floats with a
          // margin instead of hitting the screen edges square-cornered.
          // Centred with the `translate` property, not a transform utility, so
          // the motion system's transform (scale, y) composes with it.
          `fixed left-1/2 top-1/2 ${CONTAINER_Z} grid w-[calc(100%-2rem)] max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg [translate:-50%_-50%]`,
          stacked && DIALOG_STACKED_Z,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.close')}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-start', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
