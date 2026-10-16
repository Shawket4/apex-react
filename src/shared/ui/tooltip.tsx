import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/shared/lib/cn';
import { composeRefs, recipes, useEnter } from '@/shared/lib/motion';
import { OVERLAY_Z } from './z-index';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const own = React.useRef<HTMLDivElement>(null);
  useEnter(own, () => recipes.popper(own.current?.dataset.side));
  return (
    <TooltipPrimitive.Content
      ref={composeRefs(own, ref)}
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
