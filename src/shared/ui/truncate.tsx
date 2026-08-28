import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Text that explains itself only when it has to                               */
/*                                                                            */
/* A `title` set unconditionally puts a tooltip on every cell, including the   */
/* ones already showing their whole value — so the tooltip stops meaning       */
/* "there is more here" and becomes noise you have to wait out. This measures  */
/* the element and sets `title` only while the text is actually clipped.       */
/*                                                                            */
/* Arabic matters here: these are Arabic place names and driver names of up to */
/* 33 characters in columns far narrower than that, so truncation is the rule  */
/* rather than the exception — but which fields clip depends on the viewport,  */
/* and hard-coding the guess would be wrong at half the widths.                */
/* -------------------------------------------------------------------------- */

export interface TruncateProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The full text. Anything else renders, but only a string can be a tooltip. */
  children: React.ReactNode;
  /** Overrides the tooltip text when `children` is not a plain string. */
  title?: string;
}

export function Truncate({ children, className, title, ...rest }: TruncateProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = React.useState(false);

  const full = title ?? (typeof children === 'string' ? children : undefined);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The 1px slack absorbs sub-pixel rounding, which otherwise reports a
    // one-pixel overflow on text that visibly fits.
    const measure = () => setClipped(el.scrollWidth > el.clientWidth + 1);
    measure();

    // Column widths move with the viewport, and a cell that fits on a laptop
    // clips on a narrow window, so re-measure rather than deciding once.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, title]);

  return (
    <span
      ref={ref}
      title={clipped && full ? full : undefined}
      className={cn('block truncate', className)}
      {...rest}
    >
      {children}
    </span>
  );
}
