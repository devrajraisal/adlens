import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

// The production page may not make any network request. The browser enforces this rule,
// so the claim "your file never leaves your browser" does not depend on trusting the code.
const strictCsp = (): Plugin => ({
  name: 'strict-csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content:
          "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; " +
          "base-uri 'none'",
      },
      injectTo: 'head-prepend',
    },
  ],
})

export default defineConfig({
  base: './',
  plugins: [react(), strictCsp()],
  test: { environment: 'node' },
})
