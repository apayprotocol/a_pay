import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootWeb = path.resolve(__dirname, '..');

const entryPoint = path.join(rootWeb, 'src/checkout/checkout.ts');
const outDir = path.join(rootWeb, 'public');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('⚡ Building A-Pay Standalone Checkout Widget (@apay/checkout.js / v1.js)...');

try {
  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'APayModule',
    platform: 'browser',
    target: ['es2020'],
    outfile: path.join(outDir, 'v1.js'),
    metafile: true,
  });

  // Also duplicate to checkout.js
  fs.copyFileSync(path.join(outDir, 'v1.js'), path.join(outDir, 'checkout.js'));

  const stats = fs.statSync(path.join(outDir, 'v1.js'));
  const sizeKb = (stats.size / 1024).toFixed(2);

  console.log(`✅ Successfully compiled A-Pay Checkout Widget!`);
  console.log(`📦 Output: ${path.join(outDir, 'v1.js')} (${sizeKb} KB)`);
  console.log(`📦 Output: ${path.join(outDir, 'checkout.js')} (${sizeKb} KB)`);

  if (stats.size > 50 * 1024) {
    console.warn(`⚠️ Warning: Bundle size exceeds 50KB (${sizeKb} KB).`);
  } else {
    console.log(`✨ Micro-bundle budget passed (< 50KB).`);
  }
} catch (error) {
  console.error('❌ Failed to build widget:', error);
  process.exit(1);
}
