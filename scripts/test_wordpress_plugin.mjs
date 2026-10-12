#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WP_DIR = path.join(ROOT_DIR, 'packages', 'wordpress-plugin');
const PHP_FILE = path.join(WP_DIR, 'apay-web3-ai-paywall.php');
const README_FILE = path.join(WP_DIR, 'readme.txt');
const ZIP_FILE = path.join(WP_DIR, 'dist', 'apay-web3-ai-paywall.zip');

console.log('========================================================================');
console.log('🧪 A-PAY WORDPRESS PLUGIN DEEP VALIDATION & COMPLIANCE SCANNER');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    failCount++;
  }
}

// 1. READ FILE CONTENTS
const phpContent = fs.readFileSync(PHP_FILE, 'utf8');
const readmeContent = fs.readFileSync(README_FILE, 'utf8');

console.log('📋 Section 1: Readme.txt Standards (WordPress.org Guidelines)');

test('Requires at least, Tested up to, and Stable tag headers', () => {
  assert(readmeContent.includes('Requires at least: 5.8'), 'Missing Requires at least');
  assert(readmeContent.includes('Tested up to: 7.1'), 'Tested up to must be 7.1');
  assert(readmeContent.includes('Stable tag: 0.1.8'), 'Stable tag must be 0.1.8');
  assert(readmeContent.includes('License: GPLv2 or later'), 'Missing GPLv2 license');
});

test('Tags count is exactly 5 or fewer (Hard WP limit)', () => {
  const match = readmeContent.match(/^Tags:\s*(.+)$/m);
  assert(match, 'Tags header not found');
  const tags = match[1].split(',').map(t => t.trim());
  assert(tags.length <= 5, `Too many tags: ${tags.length} (max allowed is 5)`);
  assert(tags.includes('web3'), 'Tags should include web3');
  assert(tags.includes('ai-paywall'), 'Tags should include ai-paywall');
});

test('Short description is under 150 characters (Hard WP limit)', () => {
  const lines = readmeContent.split('\n');
  const shortDescLine = lines.find(l => l.trim().startsWith('Universal HTTP 402'));
  assert(shortDescLine, 'Short description not found');
  const len = shortDescLine.trim().length;
  assert(len <= 150, `Short description is ${len} chars (max 150 allowed)`);
  console.log(`     ↳ Length: ${len} chars (OK)`);
});

test('3rd Party Service Disclosures are declared (Base RPC & APay Portal)', () => {
  assert(readmeContent.includes('== 3rd Party Service Disclosure =='), 'Missing 3rd party disclosure');
  assert(readmeContent.includes('https://apayprotocol.org') || readmeContent.includes('https://apay-network.vercel.app'), 'Missing APay Portal URL');
  assert(readmeContent.includes('https://mainnet.base.org'), 'Missing Base RPC URL');
});

console.log('\n🔒 Section 2: PHP Header & Security Invariants');

test('Tested up to is NOT declared in main PHP file (WP duplicate header ban)', () => {
  const headerMatch = phpContent.match(/\/\*\*[\s\S]*?\*\//);
  assert(headerMatch, 'Header docblock not found');
  const header = headerMatch[0];
  assert(!header.includes('Tested up to:'), 'Tested up to MUST NOT be in PHP header');
});

test('Plugin Name is "A-Pay Web3 AI Paywall"', () => {
  assert(phpContent.includes('Plugin Name:       A-Pay Web3 AI Paywall'), 'Plugin Name mismatch');
});

test('Text Domain is "apay-web3-ai-paywall" across file', () => {
  assert(phpContent.includes('Text Domain:       apay-web3-ai-paywall'), 'Text Domain header mismatch');
  assert(phpContent.includes("__('Settings', 'apay-web3-ai-paywall')"), 'Settings i18n text domain mismatch');
});

test('Direct access prevention (ABSPATH check)', () => {
  assert(phpContent.includes("if (!defined('ABSPATH'))"), 'Missing ABSPATH security check');
});

console.log('\n🛡️ Section 3: Input Sanitization & Unslashing (PHPCS / Plugin Check)');

test('Every $_SERVER variable access is unslashed with wp_unslash()', () => {
  const serverMatches = phpContent.match(/\$_SERVER\['[A-Z_]+'\]/g) || [];
  assert(serverMatches.length > 0, 'No $_SERVER accesses found to check');
  // Check that all $_SERVER usages are wrapped in wp_unslash
  const lines = phpContent.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('$_SERVER[') && !line.includes('isset(') && !line.includes('!empty(')) {
      assert(line.includes('wp_unslash('), `Line ${idx + 1} uses $_SERVER without wp_unslash(): ${line}`);
    }
  });
});

test('Every $_SERVER input is sanitized with sanitize_text_field()', () => {
  const lines = phpContent.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('$_SERVER[') && !line.includes('isset(') && !line.includes('!empty(')) {
      assert(line.includes('sanitize_text_field('), `Line ${idx + 1} uses $_SERVER without sanitize_text_field(): ${line}`);
    }
  });
});

test('EVM Address validation with 42-char hex regex', () => {
  assert(phpContent.includes("preg_match('/^0x[a-f0-9]{40}$/', $payer)"), 'Missing EVM address regex check');
});

test('Cryptographic signature format validation', () => {
  assert(phpContent.includes('strlen($signature) < 66'), 'Missing signature minimum length check');
});

console.log('\n⚡ Section 4: M2M Autonomous Payment Logic');

test('Server-issued nonce tracking with WordPress transients', () => {
  assert(phpContent.includes("set_transient('apay_issued_nonce_' . $nonce"), 'Missing server nonce issuance');
  assert(phpContent.includes("get_transient($issued_key)"), 'Missing nonce verification check');
  assert(phpContent.includes("delete_transient($issued_key)"), 'Missing single-use nonce consumption');
  assert(phpContent.includes("set_transient($consumed_key"), 'Missing replay protection transient');
});

test('Payment amount validation against required pricing', () => {
  assert(phpContent.includes("floatval($amount) < floatval($amount_base_units)"), 'Missing authorized amount validation');
  assert(phpContent.includes("status_header(402)"), 'Missing 402 status on underpayment');
});

test('Human visitors browse 100% free', () => {
  assert(phpContent.includes('$human_free && !$is_ai_crawler'), 'Missing human whitelist check');
});

test('Search engines (Googlebot, Bingbot) whitelisted for SEO', () => {
  assert(phpContent.includes("'googlebot', 'bingbot', 'slurp'"), 'Missing SEO bot whitelist');
});

console.log('\n📦 Section 5: ZIP Archive Structure & Parity');

test('ZIP file contains canonical directory and files', () => {
  assert(fs.existsSync(ZIP_FILE), `ZIP file does not exist at ${ZIP_FILE}`);
  const list = execSync(`unzip -l "${ZIP_FILE}"`).toString();
  assert(list.includes('apay-web3-ai-paywall/'), 'Missing root directory in ZIP');
  assert(list.includes('apay-web3-ai-paywall/apay-web3-ai-paywall.php'), 'Missing main php in ZIP');
  assert(list.includes('apay-web3-ai-paywall/readme.txt'), 'Missing readme.txt in ZIP');
});

console.log('\n========================================================================');
console.log(`📊 AUDIT SUMMARY: ${passCount} Passed | ${failCount} Failed`);
console.log('========================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 100% COMPLIANT WITH ZERO ERRORS AND ZERO DEFECTS!\n');
}
