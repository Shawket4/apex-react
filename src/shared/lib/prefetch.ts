import { PREFETCH_URLS } from './animations';

/**
 * Prefetches all Lottie animations and lazy-loaded Lottie JS bundle chunk in the background.
 * Uses requestIdleCallback to run without blocking initial application mounting/rendering.
 */
export function prefetchAnimations() {
  if (typeof window === 'undefined') return;

  const runPrefetch = () => {
    // 1. Prefetch the Lottie assets and let the browser store them in HTTP Cache
    PREFETCH_URLS.forEach((asset) => {
      fetch(asset, { cache: 'force-cache' }).catch((err) => {
        console.warn(`Failed to prefetch animation asset: ${asset}`, err);
      });
    });

    // 2. Prefetch the lazy-loaded JS chunk for @lottiefiles/dotlottie-react
    import('@lottiefiles/dotlottie-react').catch(() => {});
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => runPrefetch());
  } else {
    // Fallback: wait 1.5 seconds after mounting to trigger
    setTimeout(runPrefetch, 1500);
  }
}
