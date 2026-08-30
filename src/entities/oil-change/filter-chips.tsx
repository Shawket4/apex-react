import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

/**
 * The three filters recorded alongside an oil change. Ordered as the workshop
 * says them, and as the sheet lists them: oil, fuel, water separator.
 */
export const OIL_FILTER_KEYS = ['oil', 'fuel', 'water'] as const;
export type OilFilterKey = (typeof OIL_FILTER_KEYS)[number];

/**
 * Three plain booleans rather than a wire shape, because the two backends
 * spell them differently — apex-rust emits `oil_filter`, FalconGo emits
 * `oil_filter_changed` — and neither name belongs in a presentation component.
 */
export interface OilChangeFilterFlags {
  oil: boolean;
  fuel: boolean;
  water: boolean;
}

/**
 * What went in with the oil, as three states readable at a glance down a
 * column: filled means replaced, hollow means it wasn't.
 *
 * Letters rather than icons because three filter glyphs are indistinguishable
 * at this size, and they come from i18n so Arabic gets its own initials rather
 * than transliterated Latin ones. `title` plus an sr-only label instead of a
 * Tooltip: this renders three times per row and a fleet can fill a whole
 * table with them, which is a lot of popper instances for a three-letter hint.
 */
export function OilChangeFilterChips({
  flags,
  className,
}: {
  flags: OilChangeFilterFlags;
  className?: string;
}) {
  const { t } = useTranslation();
  const on = flags;
  return (
    <span className={cn('flex items-center gap-1', className)}>
      {OIL_FILTER_KEYS.map((key) => {
        const label = t(
          on[key] ? `oilChanges.filters.${key}Done` : `oilChanges.filters.${key}NotDone`,
        );
        return (
          <span
            key={key}
            title={label}
            className={cn(
              'inline-flex h-4 min-w-4 items-center justify-center rounded-[3px] px-1 text-[9px] font-semibold leading-none',
              on[key]
                ? 'bg-primary/10 text-primary'
                : 'border border-dashed border-muted-foreground/30 text-muted-foreground/50',
            )}
          >
            <span aria-hidden>{t(`oilChanges.filters.${key}Short`)}</span>
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </span>
  );
}
