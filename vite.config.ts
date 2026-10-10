import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Canonical/og URLs need the production origin at build time. Netlify exposes
// the site's primary URL as `URL` during builds, so fall back to that when
// VITE_SITE_URL isn't set explicitly.
if (!process.env.VITE_SITE_URL && process.env.URL) {
  process.env.VITE_SITE_URL = process.env.URL
}

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],

  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})