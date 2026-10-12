#!/usr/bin/env node
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const WP_PLUGIN_DIR = path.join(ROOT_DIR, 'packages', 'wordpress-plugin');
const PUBLIC_DOWNLOADS_DIR = path.join(ROOT_DIR, 'web', 'public', 'downloads');
const USER_DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');
const DIST_DIR = path.join(WP_PLUGIN_DIR, 'dist');

const CANONICAL_SLUG = 'apay-web3-ai-paywall';
const LEGACY_SLUGS = [
  'a-pay-protocol-m2m-ai-paywall',
  'apay98-autonomous-crawler-paywall',
  'apay-paywall'
];

console.log('========================================================================');
console.log('📦 A-PAY PROTOCOL: WORDPRESS.ORG OFFICIAL DIRECTORY PACKAGING ENGINE');
console.log('========================================================================\n');

// 1. Verify required source files exist
const canonicalPhpFile = path.join(WP_PLUGIN_DIR, `${CANONICAL_SLUG}.php`);
const readmeFile = path.join(WP_PLUGIN_DIR, 'readme.txt');

if (!fs.existsSync(canonicalPhpFile) || !fs.existsSync(readmeFile)) {
  console.error(`❌ Missing ${CANONICAL_SLUG}.php or readme.txt in packages/wordpress-plugin`);
  process.exit(1);
}

// 2. Prepare build directory
fs.rmSync(DIST_DIR, { recursive: true, force: true });
const canonicalSlugDir = path.join(DIST_DIR, CANONICAL_SLUG);
fs.mkdirSync(canonicalSlugDir, { recursive: true });
fs.mkdirSync(PUBLIC_DOWNLOADS_DIR, { recursive: true });

// 3. Populate Canonical Directory
fs.copyFileSync(canonicalPhpFile, path.join(canonicalSlugDir, `${CANONICAL_SLUG}.php`));
fs.copyFileSync(readmeFile, path.join(canonicalSlugDir, 'readme.txt'));

// 4. Create Canonical ZIP archive
const canonicalZipPath = path.join(DIST_DIR, `${CANONICAL_SLUG}.zip`);
execSync(`cd "${DIST_DIR}" && zip -r -9 ${CANONICAL_SLUG}.zip ${CANONICAL_SLUG}/`, { stdio: 'inherit' });

// Copy Canonical to distribution targets
const copyTargets = [
  { src: canonicalZipPath, dest: path.join(WP_PLUGIN_DIR, `${CANONICAL_SLUG}.zip`) },
  { src: canonicalZipPath, dest: path.join(PUBLIC_DOWNLOADS_DIR, `${CANONICAL_SLUG}.zip`) },
];

if (fs.existsSync(USER_DOWNLOADS_DIR)) {
  copyTargets.push({ src: canonicalZipPath, dest: path.join(USER_DOWNLOADS_DIR, `${CANONICAL_SLUG}.zip`) });
}

// 5. Create backward compatible mirrors for tests / web portal
for (const legacySlug of LEGACY_SLUGS) {
  const legacyZip = path.join(DIST_DIR, `${legacySlug}.zip`);
  fs.copyFileSync(canonicalZipPath, legacyZip);
  copyTargets.push({ src: legacyZip, dest: path.join(WP_PLUGIN_DIR, `${legacySlug}.zip`) });
  copyTargets.push({ src: legacyZip, dest: path.join(PUBLIC_DOWNLOADS_DIR, `${legacySlug}.zip`) });
  if (fs.existsSync(USER_DOWNLOADS_DIR)) {
    copyTargets.push({ src: legacyZip, dest: path.join(USER_DOWNLOADS_DIR, `${legacySlug}.zip`) });
  }
}

for (const target of copyTargets) {
  fs.copyFileSync(target.src, target.dest);
}

// Copy raw php files to web downloads
fs.copyFileSync(canonicalPhpFile, path.join(PUBLIC_DOWNLOADS_DIR, `${CANONICAL_SLUG}.php`));
for (const legacySlug of LEGACY_SLUGS) {
  fs.copyFileSync(canonicalPhpFile, path.join(PUBLIC_DOWNLOADS_DIR, `${legacySlug}.php`));
}
fs.copyFileSync(readmeFile, path.join(PUBLIC_DOWNLOADS_DIR, 'readme.txt'));

// 6. Generate SHA-256 integrity hash
const canonicalZipBuffer = fs.readFileSync(canonicalZipPath);
const canonicalSha256 = crypto.createHash('sha256').update(canonicalZipBuffer).digest('hex');
const canonicalSizeKb = (canonicalZipBuffer.length / 1024).toFixed(2);

console.log('\n========================================================================');
console.log('✅ WORDPRESS PLUGIN PACKAGE READY FOR OFFICIAL SUBMISSION!');
console.log('========================================================================');
console.log(`📁 Canonical Slug : ${CANONICAL_SLUG}`);
console.log(`📦 Primary File   : ${CANONICAL_SLUG}.zip (${canonicalSizeKb} KB)`);
console.log(`🔒 SHA-256 Hash   : ${canonicalSha256}`);
console.log(`📍 Submission Zip : ${path.join(USER_DOWNLOADS_DIR, `${CANONICAL_SLUG}.zip`)}`);
console.log(`🌐 Submission URL : https://wordpress.org/plugins/developers/add/`);
console.log('========================================================================\n');
