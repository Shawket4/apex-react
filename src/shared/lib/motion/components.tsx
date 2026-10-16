import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { enter } from './engine';
import {
  groupDelay,
  useCountUp,
  useLanding,
  useReveal,
  useStagger,
  type RevealOptions,
  type StaggerOptions,
} from './hooks';
import { useIsoLayoutEffect } from './latest';
import { inViewport, prefersReducedMotion } from './media';
import { Arriving, parseFigure } from './support';
import { fade, rise } from './recipes';
import { DURATION } from './tokens';

type DivProps = Omit<React.ComponentProps<'div'>, 'ref'>;

/**
 * Rise into place on mount (or when `when` turns true). `asChild` puts the
 * motion on the single child instead of adding a wrapper.
 */
export function Reveal({
  asChild,
  recipe,
  delay,
  inGroup,
  when,
  replayKey,
  ...props
}: DivProps & RevealOptions & { asChild?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useReveal(ref, { recipe, delay, inGroup, when, replayKey });
  const Comp = asChild ? Slot : 'div';
  return <Comp ref={ref} {...props} />;
}

/** Bring the children in one after another (only those on screen, capped). */
export function Stagger({
  asChild,
  recipe,
  selector,
  when,
  replayKey,
  delay,
  ...props
}: DivProps & StaggerOptions & { asChild?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useStagger(ref, { recipe, selector, when, replayKey, delay });
  const Comp = asChild ? Slot : 'div';
  return (
    <Arriving.Provider value>
      <Comp ref={ref} data-stagger="" {...props} />
    </Arriving.Provider>
  );
}

interface CountUpProps extends Omit<React.ComponentProps<'span'>, 'ref' | 'children'> {
  value: number;
  /** Formats the figure, including mid-count fractions. */
  format: (n: number) => string;
  duration?: number;
}

/**
 * A KPI figure that counts up on first reveal, in lockstep with the charts
 * (DURATION.count), then shows later changes at once. Tabular numerals keep
 * its width still.
 */
export function CountUp({ value, format, className, duration, ...props }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useCountUp(ref, value, format, { duration });
  return (
    <span ref={ref} className={['tabular-nums', className].filter(Boolean).join(' ')} {...props}>
      {format(value)}
    </span>
  );
}

/** Count a pre-formatted figure up (see parseFigure); anything else renders as given. */
export function CountUpText({ children }: { children: React.ReactNode }) {
  const parsed =
    typeof children === 'string' || typeof children === 'number'
      ? parseFigure(String(children))
      : null;
  return <CountUpTextInner parsed={parsed}>{children}</CountUpTextInner>;
}

function CountUpTextInner({
  parsed,
  children,
}: {
  parsed: ReturnType<typeof parseFigure>;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  // A stable formatter per figure text: the count reads it on every frame.
  useCountUp(ref, parsed?.value ?? 0, parsed?.format ?? String);
  if (!parsed) return <>{children}</>;
  return <span ref={ref}>{parsed.format(parsed.value)}</span>;
}

/**
 * A chart's entrance: the frame fades up while Recharts draws the series.
 * `ChartCard` already wears one; inside a Stagger it stays still and lets the
 * Stagger bring it in.
 */
export function ChartEntrance({ asChild, ...props }: DivProps & { asChild?: boolean }) {
  const inside = React.useContext(Arriving);
  const Comp = asChild ? Slot : 'div';
  if (inside) return <Comp {...props} />;
  return <Reveal asChild={asChild} recipe={fade(DURATION.base)} {...props} />;
}

/**
 * Skeleton while loading; when the data lands the skeleton fades out first
 * (an overlay over the content, which renders hidden in the same commit) and
 * then the content rises in where it was, in step with the group it sits in.
 * Never both half-visible at once. Content there from the start arrives with
 * its page instead. Reduced motion: the content, at once.
 */
export function SkeletonSwap({
  loading,
  skeleton,
  className,
  contentClassName,
  children,
}: {
  loading: boolean;
  skeleton: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const landing = useLanding<HTMLDivElement>(loading);
  const root = React.useRef<HTMLDivElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = content.current;
    if (!landing.arrivals || !el || prefersReducedMotion() || !inViewport(el)) return;
    const beat = root.current ? groupDelay(root.current) : 0;
    return enter([el], rise(), [beat + landing.delay]);
  }, [landing.arrivals]);
  return (
    <div ref={root} className={['relative', className].filter(Boolean).join(' ')}>
      {loading ? (
        skeleton
      ) : (
        <div key={landing.arrivals} ref={content} className={contentClassName}>
          {children}
        </div>
      )}
      {landing.leaving ? (
        <div ref={landing.ghostRef} aria-hidden className="pointer-events-none absolute inset-0">
          {skeleton}
        </div>
      ) : null}
    </div>
  );
}
