import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/shared/lib/cn';

const Tabs = TabsPrimitive.Root;

/**
 * `unstyled` drops the default pill-strip look and keeps only the behaviour,
 * for callers that render their own control through `asChild`.
 *
 * It has to be opt-out rather than overridable: Radix merges the child's
 * className with this one, so a default like `data-[state=active]:bg-background`
 * does not lose to a custom `bg-primary` — both apply, and the later rule in
 * the stylesheet wins. That silently painted the locations tabs white when
 * they were active.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { unstyled?: boolean }
>(({ className, unstyled, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      !unstyled &&
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { unstyled?: boolean }
>(({ className, unstyled, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      !unstyled &&
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
