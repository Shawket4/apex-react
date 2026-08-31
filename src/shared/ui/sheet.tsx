import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { CONTAINER_Z, STACKED_CONTAINER_Z } from './z-index';

const Sheet = DialogPrimitive.Root;
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
      // Arbitrary properties, not duration-*/ease-* utilities. Both Tailwind core
      // and tailwindcss-animate define `duration`, and the variant form
      // (data-[state=open]:duration-350) emits no rule at all — the durations
      // that used to be written that way were dead, which is why every drawer
      // ran at the plugin's 150ms default.
      `fixed inset-0 ${CONTAINER_Z} bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ![animation-duration:350ms] [animation-timing-function:cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:![animation-duration:250ms] data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,1,1)]`,
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  // `transition` alone is transition-property: all, which makes the
  // browser watch every property on a panel that is already being moved by
  // a keyframe animation. The keyframes do the work; the transition only
  // added overhead.
  //
  // will-change-transform promotes the panel to its own layer up front, so
  // the first frame of the slide is not also a layer-creation frame.
  //
  // Motion, not a jump cut. 350ms in / 250ms out is long enough for the eye to
  // follow the panel and short enough to still feel like a response.
  //
  // The curves matter more than the numbers. Entry decelerates — it arrives
  // quickly and settles, which is what gives a panel weight instead of making
  // it appear. Exit accelerates away, because a panel leaving does not need to
  // be watched. Symmetric easing is the usual reason a drawer feels mushy.
  //
  // Written as arbitrary properties because the `duration-*`/`ease-*` variant
  // form generates no CSS here: Tailwind core and tailwindcss-animate both
  // define those utility names, and `data-[state=open]:duration-500` emitted
  // nothing at all. Every drawer in this app has been running at the plugin's
  // 150ms default with plain `ease`, whatever the class list claimed.
  `fixed ${CONTAINER_Z} gap-4 bg-background shadow-lg will-change-transform data-[state=open]:animate-in data-[state=closed]:animate-out ![animation-duration:350ms] [animation-timing-function:cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:![animation-duration:250ms] data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,1,1)]`,
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 start-0 h-full w-3/4 border-e data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right',
        right:
          'inset-y-0 end-0 h-full w-3/4 border-s data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

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
  return (
  <SheetPortal>
    <SheetOverlay className={stacked ? STACKED_Z : undefined} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), stacked && STACKED_Z, className)}
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

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetPortal, SheetOverlay };
