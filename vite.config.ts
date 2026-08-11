import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy for ACAPS API — avoids CORS during development
    // NOTE: For production, deploy a Vercel/Netlify edge function or serverless
    // proxy since api.acaps.org does not allow browser-origin requests.
    proxy: {
      '/api/acaps': {
        target: 'https://api.acaps.org/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/acaps/, ''),
      },
    },
  },
})
