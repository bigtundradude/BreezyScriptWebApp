import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { devtools } from '@tanstack/devtools-vite'

// base '/app/' + router basepath '/app' + dist/_redirects are a matched set —
// see docs/breezyscript-web-migration-design.md §2.2 before changing any of them.
export default defineConfig({
  base: '/app/',
  plugins: [
    devtools(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    // Fixed, project-unique port so BreezyScript never clashes with other
    // local projects. strictPort fails loudly instead of silently shifting
    // (a shifted port would also break the OAuth SITE_URL).
    port: 5199,
    strictPort: true,
  },
  preview: {
    port: 5198,
    strictPort: true,
  },
  build: {
    // The SPA builds into dist/app; scripts/postbuild.mjs adds the landing page
    // at dist/ and writes dist/_redirects (NOT via publicDir — it would land in dist/app).
    outDir: 'dist/app',
    emptyOutDir: true,
  },
})
