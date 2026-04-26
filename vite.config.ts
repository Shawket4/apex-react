import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import compression from 'vite-plugin-compression';
import path from 'node:path';
import { constants as zlibConstants } from 'node:zlib';

export default defineConfig({
  plugins: [
    react(),

    /**
     * Pre-compress every chunk to .br at build time using brotli's MAXIMUM
     * quality level (11). The build is slower — expect a few extra seconds
     * for the big chunks like exceljs and chart-vendor — but every byte
     * shaved here is bytes the user never downloads, on every request,
     * forever. Worth it.
     *
     * Nginx serves these directly via `brotli_static on` (zero CPU at
     * request time). We keep the original uncompressed file too, so
     * clients without brotli support (very old browsers, server-to-server
     * curl etc.) still work via the .gz fallback or raw response.
     */
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
          // Hint that the input is text — brotli has a separate dictionary
          // for text content that improves compression on JS/CSS/HTML.
          [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        },
      },
    }),

    /**
     * Pre-compress every chunk to .gz too, at the maximum gzip level (9).
     * About 96% of users hit the brotli path; the gzip path is the
     * fallback for the remaining 4% (very old browsers, some corporate
     * proxies that strip Accept-Encoding: br).
     */
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: {
        level: 9,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    host: true,
  },

  build: {
    /**
     * exceljs is ~940 kB on its own and that's after minification — it's
     * already a lazy chunk, so this limit just silences the warning.
     */
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        /**
         * Vendor chunk strategy.
         *
         * Function form (rather than the object form) lets us catch every
         * package in a namespace without listing each one by name —
         * important for `@radix-ui/*` where the exact sub-packages depend
         * on which shadcn primitives we use.
         *
         * exceljs is NOT listed here — it's already dynamically imported at
         * its call site, so Rollup gives it its own chunk automatically.
         *
         * The Google Maps JS SDK itself is also excluded: it is fetched at
         * runtime directly from Google's CDN by @googlemaps/js-api-loader,
         * so Rollup never sees those bytes. Only the loader package ends up
         * in our bundle, and it goes into its own chunk below.
         *
         * Order matters: more-specific matches above the catch-alls.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Google Maps loader — small package (~8 kB minified) that barely
          // ever changes. Isolated into its own chunk so:
          //   1. The lazy map-view chunk stays small and cache-busts only
          //      when our map code actually changes.
          //   2. The loader itself enjoys near-permanent cache hits because
          //      it only invalidates when we bump @googlemaps/js-api-loader.
          if (id.includes('@googlemaps/')) return 'maps-vendor';

          if (id.includes('/leaflet/')) return 'leaflet-vendor';
          // Charts — recharts pulls in a chunk of d3-* sub-packages.
          // Splitting these out means the dashboard chunk stays small.
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'chart-vendor';
          }

          // MessagePack decoder — only the trip-statistics page uses it.
          if (id.includes('@msgpack/')) return 'msgpack-vendor';

          // Forms + validation — react-hook-form, zod, hookform resolver.
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('/zod/')
          ) {
            return 'form-vendor';
          }

          // TanStack Query + Table — used together throughout the app.
          if (id.includes('@tanstack/')) return 'query-vendor';

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n-vendor';
          }

          // Date utilities
          if (id.includes('date-fns')) return 'date-vendor';

          // All Radix UI primitives go together — fourteen tiny packages,
          // bundling them avoids fourteen tiny chunk requests.
          if (id.includes('@radix-ui/')) return 'ui-vendor';

          // React core last so it wins as a catch-all for the framework.
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('react-router')
          ) {
            return 'react-vendor';
          }

          // Everything else (axios, clsx, cva, sonner, tailwind-merge,
          // lucide-react, zustand, cmdk, next-themes) goes to the default
          // vendor chunk. They're all small and used app-wide.
          return undefined;
        },
      },
    },
  },
});