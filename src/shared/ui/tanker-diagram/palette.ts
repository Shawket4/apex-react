import { CHART_SERIES_COLORS } from '@/shared/lib/chart-theme';

/* -------------------------------------------------------------------------- */
/* Product and drop colours                                                    */
/*                                                                            */
/* Split from the diagram so the trip form can colour its chips without       */
/* pulling three.js into its chunk: the diagram is lazy-loaded, these are not. */
/* -------------------------------------------------------------------------- */

/** Theme token per product, for the scene (resolved to hex by useThemeTokens). */
export const GAS_TOKENS: Record<string, string> = {
  '80': 'money',
  '92': 'primary',
  '95': 'success',
};
export const DIESEL_HEX = '#8B5CF6';

const GAS_CSS: Record<string, string> = {
  '80': 'hsl(var(--money))',
  '92': 'hsl(var(--primary))',
  '95': 'hsl(var(--success))',
  diesel: DIESEL_HEX,
};
const UNSET_CSS = 'hsl(var(--muted-foreground))';

/** Short product code shown on the tank. */
export function gasCode(gasType: string): string {
  const gas = gasType?.trim().toLowerCase();
  if (gas === 'diesel') return 'DSL';
  return gas.toUpperCase();
}

/** Product colour as a CSS value, for the DOM controls around the scene. */
export function gasColor(gasType: string): string {
  return GAS_CSS[gasType?.trim().toLowerCase()] ?? UNSET_CSS;
}

/**
 * Drop colours, deliberately disjoint from the product colours above.
 *
 * A compartment is filled with its product and marked with its drop, so the two
 * encodings sit on the same shape; drawing drop 1 in the same navy as gas 92
 * made a compartment holding 92 for drop 1 read as one flat block. These four
 * are the chart palette's later slots, which no product uses. Four is enough —
 * the form caps a trip at four drops.
 */
const DROP_COLORS = CHART_SERIES_COLORS.slice(4);

/** Marker colour identifying the drop a compartment belongs to. */
export function dropColor(dropIndex: number): string {
  return DROP_COLORS[dropIndex % DROP_COLORS.length];
}
