/**
 * Console Silencer
 *
 * Filters out noise from browser extensions (Grammarly, LastPass, etc.)
 * that frequently spam the console during React navigation. These errors
 * (like FrameDoesNotExistError) are external to our app logic and safe
 * to ignore.
 */

const IGNORED_PATTERNS = [
  'FrameDoesNotExistError',
  'message port closed',
  'Could not establish connection',
  'browsing-topics',
  'google.maps.Marker is deprecated',
];

export function initConsoleSilencer() {
  if (import.meta.env.PROD) return;

  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (IGNORED_PATTERNS.some((p) => msg.includes(p))) return;
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (IGNORED_PATTERNS.some((p) => msg.includes(p))) return;
    originalError(...args);
  };

  // Catch unhandled rejections from extension background scripts
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason);
    if (IGNORED_PATTERNS.some((p) => msg.includes(p))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}
