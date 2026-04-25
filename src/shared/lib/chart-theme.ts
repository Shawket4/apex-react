import type { TooltipProps } from 'recharts';

/**
 * Chart series palette.
 *
 * Picked from the mid-range of each color family so tints work in both light
 * and dark mode without re-tinting per theme. The first slot reads from your
 * CSS variable so the brand color stays in sync with theme changes.
 *
 * If you ever want fully themed series colors, define `--chart-1` through
 * `--chart-8` in your CSS and swap these to `hsl(var(--chart-N))`.
 */
export const CHART_SERIES_COLORS = [
  'hsl(var(--primary))',
  '#10B981', // emerald — works on both light & dark backgrounds
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
];

/**
 * The "Other" bucket color — neutral so it doesn't compete visually with the
 * named series.
 */
export const CHART_OTHER_COLOR = '#6B7280';

/**
 * Slugify a string for use in SVG element IDs.
 *
 * Recharts uses `dataKey` directly as the property accessor (with spaces
 * intact), but SVG `url(#...)` references break on whitespace and other
 * special characters. So when generating `<linearGradient id="...">` from a
 * dynamic name (company name, group name, etc.) we must slugify the name
 * for the id while keeping the original name on `dataKey`.
 *
 * Without this fix, gradient fills resolve to nothing and stacked area
 * charts draw transparent (which looks like the chart isn't rendering at
 * all, even though the SVG paths are present in the DOM).
 */
export function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * Recharts Tooltip styling props that respect theme tokens.
 *
 * Use these directly on your `<Tooltip>` element:
 *
 *   <Tooltip {...themedTooltipProps} formatter={...} labelFormatter={...} />
 */
export const themedTooltipProps: Pick<
  TooltipProps<number, string>,
  'contentStyle' | 'itemStyle' | 'labelStyle' | 'cursor'
> = {
  contentStyle: {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  itemStyle: {
    color: 'hsl(var(--popover-foreground))',
  },
  labelStyle: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: 11,
    marginBottom: 4,
  },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.4 },
};

/**
 * Tick styling for X/Y axes — uses the muted-foreground token so axes look
 * appropriately quiet in both light and dark mode.
 */
export const themedAxisTickProps = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
};
