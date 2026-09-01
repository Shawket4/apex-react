import * as React from 'react';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Chip selectors                                                              */
/*                                                                            */
/* One visual language for "pick one of these", replacing the three            */
/* copy-pasted versions that had drifted apart (fleet-expenses' FilterChip,    */
/* fuel-events' MethodButton, locations' pinPills — same control, three sizes, */
/* three shapes, three ways of showing a count).                              */
/*                                                                            */
/* The layout rule is the one already used across the app for toolbars that do */
/* not fit a phone: the row scrolls sideways rather than squeezing, and bleeds */
/* to the page edge through a negative margin so it is visibly cut off rather  */
/* than stopping short at the padding and looking complete. At `sm` and up     */
/* there is room, so it wraps inline instead.                                  */
/*                                                                            */
/* Squeezing is what this replaces. A three-column grid gives every chip a     */
/* third of 360px whether it needs it or not, so a long label truncates to     */
/* "Nee…" while a short one sits in whitespace — and the count, which is the   */
/* only reason to look at the control, is the first thing to go.               */
/* -------------------------------------------------------------------------- */

/**
 * The scrolling row. Wraps any set of `Chip`s (or Radix triggers rendered as
 * chips) and owns nothing but layout.
 *
 * `edgeBleed` is on by default because that is right inside PageShell's
 * padding. Turn it off where the row is already inside a padded card.
 */
export const ChipGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { edgeBleed?: boolean }
>(function ChipGroup({ className, edgeBleed = true, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto pb-1',
        // Hide the scrollbar without losing the scroll: a 8px bar under a
        // 44px chip row reads as a rendering fault on a phone.
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        edgeBleed && '-mx-4 px-4 sm:mx-0 sm:px-0',
        'sm:flex-wrap sm:overflow-visible sm:pb-0',
        className,
      )}
      {...props}
    />
  );
});

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected state. Drives styling; the caller owns the ARIA (see below). */
  active?: boolean;
  /** Leading glyph. Hidden on phones — the label and count come first. */
  icon?: React.ReactNode;
  /**
   * Trailing figure. Deliberately NOT hidden on small screens: a count is the
   * reason a filter chip is worth reading, and the row scrolls, so there is
   * always room for it.
   */
  count?: number;
}

/**
 * One chip.
 *
 * Sized for the finger first — 44px is the minimum comfortable target, and
 * these sit close together — then compacted at `lg`, where a pointer makes
 * the same row feel oversized.
 *
 * ARIA is the caller's, because the right role depends on the job: a
 * mutually-exclusive filter is a `radiogroup` of `radio`s, while a chip that
 * switches panels is a Radix `TabsTrigger` rendered through `asChild`. Baking
 * `aria-pressed` in here would have been wrong for both.
 */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, active = false, icon, count, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-active={active || undefined}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full',
        'border px-3.5 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        'lg:min-h-8 lg:px-3',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="hidden shrink-0 sm:inline-flex" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {typeof count === 'number' && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold leading-none tabular-nums',
            active ? 'bg-primary-foreground/20' : 'bg-muted text-foreground/70',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
});

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface ChipRadioGroupProps<T extends string> {
  label: string;
  value: T;
  options: Array<ChipOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  edgeBleed?: boolean;
}

/**
 * A mutually-exclusive chip filter, wired as a real radio group.
 *
 * The pattern this replaces used a row of buttons with `aria-pressed`, which
 * announces three independent toggles rather than one choice of three, and
 * gives no arrow-key movement. Here the group is one tab stop and the arrows
 * move (and select) within it, which is what a screen-reader or keyboard user
 * expects from a segmented control.
 */
export function ChipRadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  edgeBleed,
}: ChipRadioGroupProps<T>) {
  const refs = React.useRef(new Map<T, HTMLButtonElement>());

  const move = (delta: number) => {
    const index = options.findIndex((o) => o.value === value);
    if (index < 0) return;
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    refs.current.get(next.value)?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn(className)}>
      <ChipGroup edgeBleed={edgeBleed}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Chip
              key={option.value}
              ref={(node) => {
                if (node) refs.current.set(option.value, node);
                else refs.current.delete(option.value);
              }}
              role="radio"
              aria-checked={selected}
              // Roving tabindex: the group is one stop, arrows move inside it.
              tabIndex={selected ? 0 : -1}
              active={selected}
              icon={option.icon}
              count={option.count}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => {
                // Horizontal arrows follow the writing direction, so in Arabic
                // ArrowRight must walk backwards through the list.
                const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  move(rtl ? -1 : 1);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  move(rtl ? 1 : -1);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  move(1);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  move(-1);
                }
              }}
            >
              {option.label}
            </Chip>
          );
        })}
      </ChipGroup>
    </div>
  );
}
