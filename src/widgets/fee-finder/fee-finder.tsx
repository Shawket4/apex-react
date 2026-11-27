import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import {
  mountFeeFinder,
  type FeeFinder as FeeFinderHandle,
  type Lang,
  type Theme,
} from 'apex-fee-finder';
import 'apex-fee-finder/style.css';
import { platformFetch } from '@/shared/api/client';
import { STORAGE_KEYS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

interface FeeFinderProps {
  /** falcon-fees' API root (`…/public/distance-fetcher/api`). */
  apiBase: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* The shared route fee lookup (apex-fee-finder), mounted in the dashboard     */
/*                                                                            */
/* The package draws the whole lookup — pickers, route section, result card,   */
/* map — inside its own root and asks falcon-fees for every answer. This only  */
/* mounts it, signs its requests with the office JWT and keeps its language    */
/* and theme in step with the dashboard's.                                     */
/*                                                                            */
/* The server decides who sees fees: below permission 3 it sends none, and the */
/* package (asking /auth/session) shows them as withheld. A 401 from it is the */
/* fee service's refusal, not the office session's: no `onUnauthorized`, so    */
/* the card says so in its own words and the user stays signed in.            */
/* -------------------------------------------------------------------------- */

export function FeeFinder({ apiBase, className }: FeeFinderProps) {
  const { i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const lang: Lang = (i18n.resolvedLanguage ?? i18n.language ?? '').startsWith('ar') ? 'ar' : 'en';
  // next-themes resolves 'system' to what the OS shows.
  const theme: Theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const hostRef = React.useRef<HTMLDivElement>(null);
  const finderRef = React.useRef<FeeFinderHandle | null>(null);
  // What the finder was last told. A mount (StrictMode mounts, destroys and
  // mounts again) starts from it; a change is pushed in, never remounted.
  const shownRef = React.useRef({ lang, theme });

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const finder = mountFeeFinder(host, {
      apiBase,
      // Tauri's HTTP plugin in Tauri builds (cross-origin there), fetch elsewhere.
      fetch: platformFetch,
      // Read on every request, so a refreshed token is used from the next call.
      token: () => localStorage.getItem(STORAGE_KEYS.JWT),
      lang: shownRef.current.lang,
      theme: shownRef.current.theme,
    });
    finderRef.current = finder;
    return () => {
      finder.destroy();
      if (finderRef.current === finder) finderRef.current = null;
    };
  }, [apiBase]);

  React.useEffect(() => {
    shownRef.current = { ...shownRef.current, lang };
    finderRef.current?.setLang(lang);
  }, [lang]);

  React.useEffect(() => {
    shownRef.current = { ...shownRef.current, theme };
    finderRef.current?.setTheme(theme);
  }, [theme]);

  return <div ref={hostRef} className={cn('w-full min-w-0', className)} />;
}
