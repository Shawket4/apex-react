import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/shared/lib/cn';
import { recipes, useComposedRefs, useEnter } from '@/shared/lib/motion';
import { OVERLAY_Z } from './z-index';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  // Enters from its side and leaves the same way (see useEnter).
  const own = useEnter<HTMLDivElement>((el) => recipes.popper(el.dataset.side));
  const composed = useComposedRefs(own, ref);
  return (
    <TooltipPrimitive.Content
      ref={composed}
      sideOffset={sideOffset}
      className={cn(
        `${OVERLAY_Z} overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background`,
        className,
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
