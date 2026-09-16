/**
 * Build the two artifacts a `dsh.client` row needs: the inert Node half the
 * host Loader imports, and the browser bundle the shell's module table loads.
 *
 * The browser artifact follows the harness bundle contract — a closure factory
 * registered as `window.__ModuleLoader__.load({ id, factory })`, with baseline
 * modules (`react`, `react/jsx-runtime`) left as `require` calls the loader
 * answers from its shared module table and everything else inlined.
 */
import { defineConfig } from 'tsdown'

/** Package name stamped into the module-loader handoff. */
const ID = 'dsh-video-preview'

/** Shared module-table specifiers the shell answers; they must stay requires. */
const BASELINE = new Set(['react', 'react/jsx-runtime'])

export default defineConfig([
  {
    name: ID,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: true,
    // Both configs write into lib/, so neither may clean the other's output.
    clean: false,
  },
  {
    name: `${ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    sourcemap: true,
    // Declaration output would wrap the banner below into a .d.ts and break it.
    dts: false,
    clean: false,
    deps: {
      neverBundle: (specifier: string) => BASELINE.has(specifier),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    outputOptions: {
      // A "type": "module" package would otherwise name the CJS output
      // client.cjs, and `exports["./client"]` must name the file the host
      // serves verbatim.
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
