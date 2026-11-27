/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_BASE_URL_RUST?: string;
  /** maint-rust base. Absent: `/api/go` in VITE_API_BASE_URL becomes `/api/maint`. */
  readonly VITE_API_BASE_URL_MAINT?: string;
  /** falcon-fees base. Absent: `/api/go` in VITE_API_BASE_URL becomes `/public/distance-fetcher/api`. */
  readonly VITE_API_BASE_URL_FEES?: string;
  readonly VITE_APP_NAME?: string;
  /** Google Maps JS API key. Absent: every map uses Leaflet. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Vector map id for live tracking (advanced markers). */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
  /** `leaflet` | `google` | `auto` (default). See google-maps-config.ts. */
  readonly VITE_MAP_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set by Tauri's runtime — present when running inside the desktop shell. */
  __TAURI_INTERNALS__?: Record<string, unknown>;
}
