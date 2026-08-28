import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseScope,
  rangeForScope,
  scopeKey,
  scopeToParams,
  type Scope,
  type ScopePreset,
  type ScopeRange,
} from './scope';

export interface UseScope {
  scope: Scope;
  /** Resolved Cairo-day bounds — the exact strings queries send and key on. */
  range: ScopeRange;
  /** Stable identity for query keys: 'preset' or 'from_to'. */
  key: string;
  setPreset: (preset: ScopePreset) => void;
  setCustom: (from: string, to: string) => void;
}

/**
 * The one hook every scope consumer calls. State lives in the URL search
 * string (Madar's contract): `replace` navigation so scope clicks don't
 * pollute history, unrelated params untouched.
 */
export function useScope(): UseScope {
  const [params, setParams] = useSearchParams();

  const scope = React.useMemo(() => parseScope(params), [params]);
  const range = React.useMemo(() => rangeForScope(scope), [scope]);
  const key = scopeKey(scope);

  const setPreset = React.useCallback(
    (preset: ScopePreset) => {
      setParams((prev) => scopeToParams({ preset }, prev), { replace: true });
    },
    [setParams],
  );

  const setCustom = React.useCallback(
    (from: string, to: string) => {
      if (from > to) [from, to] = [to, from];
      setParams((prev) => scopeToParams({ preset: 'custom', from, to }, prev), {
        replace: true,
      });
    },
    [setParams],
  );

  return { scope, range, key, setPreset, setCustom };
}
