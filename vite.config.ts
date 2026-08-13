import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vite configuration for the PBB platform.
 *
 * Two entry points are served from this one config:
 *   /            → index.html → src/main.tsx   (INFORM dashboard, React)
 *   /home.html   → public/home.html            (public campaign site, static)
 *
 * The `/api/acaps` dev proxy below is the one the README documents. It was
 * missing from the committed config, so every dev-mode login failed CORS
 * against api.acaps.org (audit finding H-5).
 */
export default defineConfig(({ mode }) => {
  // Load .env* without the VITE_ prefix filter so server-only vars
  // (ACAPS_UPSTREAM_URL) are visible here but never inlined into the bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const acapsUpstream = env.ACAPS_UPSTREAM_URL || 'https://api.acaps.org'

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        /*
         * Forwards /api/acaps/* → https://api.acaps.org/* in development.
         * `changeOrigin` rewrites the Host header so ACAPS sees its own
         * origin; `secure` stays true so we still verify their certificate.
         *
         * In production there is no dev server: set VITE_ACAPS_API_URL to a
         * full origin, or put an equivalent reverse proxy in front of the
         * static host. Do not disable this and call ACAPS directly from the
         * browser — the token would then be exposed to every origin in the
         * preflight.
         */
        '/api/acaps': {
          target: acapsUpstream,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/acaps/, ''),
        },
      },
    },

    preview: {
      port: 4173,
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            recharts: ['recharts'],
            'lucide-react': ['lucide-react'],
          },
        },
      },
    },

    /*
     * Fail fast if someone tries to reference a secret from client code.
     * Only VITE_-prefixed vars are exposed; this is Vite's default, restated
     * explicitly so it is not silently widened by a future edit.
     */
    envPrefix: 'VITE_',
  }
})
