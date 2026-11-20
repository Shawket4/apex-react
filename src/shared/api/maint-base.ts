/**
 * Where the garage maintenance system (maint-rust) lives.
 *
 * It is mounted on the same host as the Go backend, under `/api/maint`, so
 * when no explicit base is configured the Go base's trailing `/api/go` is
 * swapped for it. Anything else cannot be derived safely and gives `null`.
 */
export function deriveMaintBaseURL(
  explicit: string | null | undefined,
  goBase: string | null | undefined,
): string | null {
  const configured = explicit?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const base = goBase?.trim().replace(/\/+$/, '');
  if (!base || !/\/api\/go$/.test(base)) return null;
  return base.replace(/\/api\/go$/, '/api/maint');
}
