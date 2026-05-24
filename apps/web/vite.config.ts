import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Surface package.json version in the app UI without bundling the
// whole manifest. Vite's `define` replaces the identifier at build
// time, so the production bundle just contains the string literal
// (e.g. "0.1.0"). Same pattern inpax-web / ediabasx-web use.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [svelte()],
  server: {
    port: 5173,
    strictPort: false,
  },
})
