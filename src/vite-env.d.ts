/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_BASE_URL_RUST?: string;
  readonly VITE_APP_NAME?: string;
  /** Google Maps JS API key. Absent: every map uses Leaflet. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Vector map id for live tracking (advanced markers). */
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set by Tauri's runtime — present when running inside the desktop shell. */
  __TAURI_INTERNALS__?: Record<string, unknown>;
}
