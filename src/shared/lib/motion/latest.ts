import { useEffect, useLayoutEffect, useRef } from 'react';

export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * A ref that always holds the latest `value`, synced before any later layout
 * effect in the same component runs. For callbacks and options read inside
 * long-lived effects and tweens.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useIsoLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
