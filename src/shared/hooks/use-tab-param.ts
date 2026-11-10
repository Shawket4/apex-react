import { useSearchParams } from 'react-router-dom';

/**
 * A page's open tab, kept in the address (`?tab=documents`) so a link can
 * land on a tab and Back returns to the one that was open. The first tab is
 * the default and leaves the address clean; anything unknown falls back to it.
 */
export function useTabParam<T extends string>(tabs: readonly [T, ...T[]]): [T, (tab: string) => void] {
  const [params, setParams] = useSearchParams();
  const fallback = tabs[0];
  const asked = params.get('tab');
  const tab = tabs.find((candidate) => candidate === asked) ?? fallback;

  const setTab = (next: string) => {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next === fallback) updated.delete('tab');
        else updated.set('tab', next);
        return updated;
      },
      { replace: true },
    );
  };

  return [tab, setTab];
}
