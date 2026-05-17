import successLottie from '@/assets/animations/success.lottie?url';
import warningLottie from '@/assets/animations/warning.lottie?url';
import locationRadarLottie from '@/assets/animations/location_radar.lottie?url';
import receiptLottie from '@/assets/animations/receipt.lottie?url';
import noResultsJson from '@/assets/animations/no_results.json?url';
import constructionLottie from '@/assets/animations/construction.lottie?url';
import coinsLottie from '@/assets/animations/coins.lottie?url';

export const ANIMATION_ASSETS = {
  success: successLottie,
  warning: warningLottie,
  location_radar: locationRadarLottie,
  receipt: receiptLottie,
  no_results: noResultsJson,
  construction: constructionLottie,
  coins: coinsLottie,
} as Record<string, string>;

export const PREFETCH_URLS = Object.values(ANIMATION_ASSETS);

/**
 * Intercepts legacy absolute paths (/animations/...) and swaps them
 * for Vite's natively hashed and bundled asset URLs.
 */
export function resolveAnimationPath(src: string): string {
  if (!src) return src;
  
  // Extract just the filename without extension (e.g., 'success' from '/animations/success.lottie')
  const match = src.match(/\/animations\/([^.]+)\.(lottie|json)/);
  if (match && match[1]) {
    const key = match[1];
    if (ANIMATION_ASSETS[key]) {
      return ANIMATION_ASSETS[key];
    }
  }
  
  return src;
}
