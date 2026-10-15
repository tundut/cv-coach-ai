import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

// Tìm tất cả handler files trong src/handlers/
const handlersDir = join(import.meta.dirname, 'src', 'handlers');
const entryPoints = readdirSync(handlersDir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => join(handlersDir, f));

await build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist/handlers',
  format: 'esm',
  // Output .mjs để Lambda runtime nhận diện là ES module
  outExtension: { '.js': '.mjs' },
  sourcemap: true,
  minify: false,
  // Bundle tất cả (kể cả @aws-sdk) để đảm bảo mọi package có mặt trên Lambda.
  // Lambda node20 có sẵn AWS SDK v3 nhưng không đảm bảo mọi sub-package.
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log('Backend build complete.');
