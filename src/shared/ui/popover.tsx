import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/shared/lib/cn';
import { recipes, useComposedRefs, useEnter } from '@/shared/lib/motion';
import { OVERLAY_Z } from './z-index';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, collisionPadding = 8, ...props }, ref) => {
  // Enters from its side and leaves the same way (see useEnter).
  const own = useEnter<HTMLDivElement>((el) => recipes.popper(el.dataset.side));
  const composed = useComposedRefs(own, ref);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={composed}
        align={align}
        sideOffset={sideOffset}
        // Keep the popover on screen on narrow viewports.
        collisionPadding={collisionPadding}
        className={cn(
          `${OVERLAY_Z} w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none`,
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
