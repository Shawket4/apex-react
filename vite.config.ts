import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
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
     * exceljs and leaflet are already split into their own chunks via
     * dynamic import at their call sites — they are large but loaded
     * lazily. Bumping the warning limit silences exceljs (~940 kB) which
     * we cannot do anything about without losing functionality.
     */
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        /**
         * Vendor chunk strategy.
         *
         * Note: exceljs and leaflet are NOT listed here. They're already
         * dynamically imported at their call sites, so Rollup gives them
         * their own chunks automatically — adding them here would be
         * redundant.
         *
         * Order matters: more-specific matches above the catch-alls.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Charts — recharts pulls in a chunk of d3-* sub-packages.
          // Splitting these out means the dashboard chunk stays small.
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'chart-vendor';
          }

          // MessagePack decoder — only the trip-statistics page uses it.
          // Keeping it as its own chunk lets the rest of the app skip it.
          if (id.includes('@msgpack/')) return 'msgpack-vendor';

          // Forms + validation — react-hook-form, zod, hookform resolver.
          // Loaded together on every form page.
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