import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

/**
 * A plain `<select>` styled to sit beside our inputs.
 *
 * Deliberately native. The Radix Select needed three stacked workarounds in
 * the old expenses form (an UNSET sentinel because it cannot hold "", an
 * onValueChange('') guard because unmounted items emit spurious empties, and
 * an explicit trigger label because values restored before the menu ever
 * opened had nothing to resolve against). A native select has none of those
 * failure modes, and on phones it opens the platform picker — which is the
 * better control anyway.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pe-8 text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';
