import * as React from 'react';
import type { StockCountLine } from './stock-count-dialog';

/** The state a stock card keeps for its count dialog. */
export function useStockCount() {
  const [state, setState] = React.useState<{
    line: StockCountLine | null;
    opening: number;
    open: boolean;
  }>({ line: null, opening: 0, open: false });
  return {
    dialog: {
      ...state,
      onOpenChange: (open: boolean) => setState((current) => ({ ...current, open })),
    },
    count: (line: StockCountLine) =>
      setState((current) => ({ line, opening: current.opening + 1, open: true })),
  };
}
