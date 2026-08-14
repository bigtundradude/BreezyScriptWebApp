// Assembles the two-surface deploy layout (migration brief §2.2):
//   dist/            ← public landing page (copied from landing/)
//   dist/app/        ← the SPA (Vite outDir)
//   dist/_redirects  ← SPA fallback scoped to /app/* ONLY (never a bare /*)
import { cpSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const appIndex = resolve(dist, 'app', 'index.html')

if (!existsSync(appIndex)) {
  console.error('postbuild: dist/app/index.html missing — did vite build run?')
  process.exit(1)
}

cpSync(resolve(root, 'landing'), dist, { recursive: true })

// Scoped to the app only; a bare `/* /index.html 200` would swallow the landing page.
writeFileSync(resolve(dist, '_redirects'), '/app/* /app/index.html 200\n')

if (!existsSync(resolve(dist, 'index.html')) || !existsSync(resolve(dist, '_redirects'))) {
  console.error('postbuild: expected dist/index.html and dist/_redirects to exist')
  process.exit(1)
}
console.log('postbuild: dist/ = landing + app/ + _redirects ✓')
