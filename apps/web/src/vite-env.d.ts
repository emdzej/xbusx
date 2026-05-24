/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.css'

// Injected by Vite's `define` at build time — see vite.config.ts.
// Always present in any build; declared `const string` so call sites
// can use it without optional-chaining ceremony.
declare const __APP_VERSION__: string
