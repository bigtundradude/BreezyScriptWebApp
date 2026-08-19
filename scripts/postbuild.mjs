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

// Explicit MIME types so Cloudflare Pages can never fall back to
// application/octet-stream and trip the browser's module-script MIME check,
// plus immutable caching for the content-hashed assets.
writeFileSync(
  resolve(dist, '_headers'),
  [
    '/app/assets/*.js',
    '  Content-Type: text/javascript; charset=utf-8',
    '/app/assets/*.css',
    '  Content-Type: text/css; charset=utf-8',
    '/app/fonts/*.woff2',
    '  Content-Type: font/woff2',
    '/app/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n'),
)

if (
  !existsSync(resolve(dist, 'index.html')) ||
  !existsSync(resolve(dist, '_redirects')) ||
  !existsSync(resolve(dist, '_headers'))
) {
  console.error('postbuild: expected dist/index.html, dist/_redirects, and dist/_headers to exist')
  process.exit(1)
}
console.log('postbuild: dist/ = landing + app/ + _redirects + _headers ✓')
