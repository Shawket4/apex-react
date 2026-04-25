import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface MultiSelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  /** Optional sub-label / hint shown in muted text under the main label. */
  description?: React.ReactNode;
  /** Optional dot color class (e.g. `bg-success`) for a leading status dot. */
  dot?: string;
  /** Disable this option without removing it. */
  disabled?: boolean;
}

interface MultiSelectProps<T extends string = string> {
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (next: T[]) => void;

  /** Placeholder shown on the trigger when nothing is selected. */
  placeholder?: React.ReactNode;
  /** Heading shown at the top of the popover. */
  heading?: React.ReactNode;
  /** Empty-state message when there are no options. */
  emptyState?: React.ReactNode;

  /** Optional id forwarded to the trigger button (so labels link up). */
  id?: string;
  className?: string;

  /** Match the trigger height to your form inputs. Defaults to `h-10`. */
  triggerHeight?: 'sm' | 'md';

  /** Disable the entire control. */
  disabled?: boolean;

  /** Show the trigger in compact form (no count badge / clear icon). */
  compact?: boolean;

  /** Override the popover alignment — defaults to `start` for form context. */
  align?: 'start' | 'center' | 'end';
}

/**
 * Multi-select popover with checkbox-style toggling.
 *
 * Trigger button shows the selected items as a comma-separated summary (or a
 * placeholder when empty). The body renders each option as a row with a
 * leading dot/checkbox indicator, the label, optional description, and a
 * trailing checkmark when selected. Clicking an option toggles it in place
 * without closing the popover so users can pick multiple values quickly.
 *
 * Design follows the existing `FuelEventsFilterPopover` pattern — same
 * popover-with-toggleable-rows shape, same dot-indicator approach. The
 * difference is this is generic and works with any value type.
 *
 * Use this whenever a form field needs to accept 0..N values from a fixed
 * list. For free-form tag entry use a different control.
 */
export function MultiSelect<T extends string = string>({
  options,
  value,
  onChange,
  placeholder,
  heading,
  emptyState,
  id,
  className,
  triggerHeight = 'md',
  disabled,
  compact,
  align = 'start',
}: MultiSelectProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => new Set(value), [value]);
  const count = selected.size;

  const toggle = (v: T) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    // Preserve the original option order when emitting the new array
    onChange(options.filter((o) => next.has(o.value)).map((o) => o.value));
  };

  const clear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange([]);
  };

  // Compose a readable summary of selected options for the trigger button.
  // For 1–2 items show the labels; for more, show "N selected".
  const summaryNode = React.useMemo(() => {
    if (count === 0) {
      return (
        <span className="truncate text-muted-foreground">
          {placeholder ?? t('common.select')}
        </span>
      );
    }
    if (count <= 2) {
      const labels = options
        .filter((o) => selected.has(o.value))
        .map((o) => o.label);
      return (
        <span className="truncate">
          {labels.map((l, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground">, </span>}
              {l}
            </React.Fragment>
          ))}
        </span>
      );
    }
    return (
      <span className="truncate">
        {t('common.selectedCount', { count })}
      </span>
    );
  }, [count, options, selected, placeholder, t]);

  const triggerHClass = triggerHeight === 'sm' ? 'h-9' : 'h-10';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-between gap-2 px-3 font-normal',
            triggerHClass,
            // Match the visual weight of <SelectTrigger>: when nothing's
            // selected the placeholder is muted; when something is, full
            // foreground.
            count === 0 && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {summaryNode}
            {!compact && count > 0 && (
              <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {!compact && count > 0 && (
              <span
                role="button"
                tabIndex={0}
                aria-label={t('common.clear')}
                onClick={clear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clear();
                  }
                }}
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[--radix-popover-trigger-width] min-w-[12rem] p-2"
      >
        {(heading || count > 0) && (
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {heading ?? t('common.options')}
            </p>
            {count > 0 && (
              <button
                type="button"
                onClick={() => clear()}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                {t('common.clear')}
              </button>
            )}
          </div>
        )}
        {options.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            {emptyState ?? t('common.noOptions')}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = selected.has(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => !opt.disabled && toggle(opt.value)}
                    disabled={opt.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                      isSelected
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/60',
                      opt.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                    )}
                  >
                    {opt.dot ? (
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', opt.dot)} />
                    ) : (
                      // Checkbox affordance for options without a dot
                      <span
                        className={cn(
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col text-start">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {opt.dot && isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}