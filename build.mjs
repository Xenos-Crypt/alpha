import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';

const threeAddonsPlugin = {
  name: 'three-addons-alias',
  setup(build) {
    build.onResolve({ filter: /^three\/addons\// }, (args) => ({
      path: args.path.replace(/^three\/addons\//, fileURLToPath(new URL('./node_modules/three/examples/jsm/', import.meta.url))),
    }));
  },
};

await esbuild.build({
  entryPoints: ['main.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/bundle.js',
  minify: true,
  sourcemap: true,
  platform: 'browser',
  loader: { '.wasm': 'file' },
  external: ['node:fs/promises', 'node:url'],
  plugins: [threeAddonsPlugin],
  logLevel: 'info',
});

// The bundled wasm-bindgen init() resolves `new URL('wasm_physics_bg.wasm', import.meta.url)`
// relative to bundle.js's own location once inlined, so the binary must live beside it.
await copyFile(
  fileURLToPath(new URL('./wasm-physics/pkg/wasm_physics_bg.wasm', import.meta.url)),
  fileURLToPath(new URL('./dist/wasm_physics_bg.wasm', import.meta.url)),
);
