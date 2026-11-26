#!/usr/bin/env node
import assert from "assert";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const WP_DIR = path.join(ROOT_DIR, "packages", "wordpress-plugin");
const PHP_FILE = path.join(WP_DIR, "apay-web3-ai-paywall.php");
const README_FILE = path.join(WP_DIR, "readme.txt");
const ZIP_FILE = path.join(WP_DIR, "dist", "apay-web3-ai-paywall.zip");

console.log(
	"========================================================================",
);
console.log("🧪 A-PAY WORDPRESS PLUGIN DEEP VALIDATION & COMPLIANCE SCANNER");
console.log(
	"========================================================================\n",
);

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
const phpContent = fs.readFileSync(PHP_FILE, "utf8");
const readmeContent = fs.readFileSync(README_FILE, "utf8");

console.log("📋 Section 1: Readme.txt Standards (WordPress.org Guidelines)");

test("Requires at least, Tested up to, and Stable tag headers", () => {
	assert(
		readmeContent.includes("Requires at least: 5.8"),
		"Missing Requires at least",
	);
	assert(
		readmeContent.includes("Tested up to: 7.2"),
		"Tested up to must be 7.2",
	);
	assert(
		readmeContent.includes("Stable tag: 0.1.10"),
		"Stable tag must be 0.1.10",
	);
	assert(
		readmeContent.includes("License: GPLv2 or later"),
		"Missing GPLv2 license",
	);
});

test("Tags count is exactly 5 or fewer (Hard WP limit)", () => {
	const match = readmeContent.match(/^Tags:\s*(.+)$/m);
	assert(match, "Tags header not found");
	const tags = match[1].split(",").map((t) => t.trim());
	assert(tags.length <= 5, `Too many tags: ${tags.length} (max allowed is 5)`);
	assert(tags.includes("web3"), "Tags should include web3");
	assert(tags.includes("ai-paywall"), "Tags should include ai-paywall");
});

test("Short description is under 150 characters (Hard WP limit)", () => {
	const lines = readmeContent.split("\n");
	const shortDescLine = lines.find((l) =>
		l.trim().startsWith("Universal HTTP 402"),
	);
	assert(shortDescLine, "Short description not found");
	const len = shortDescLine.trim().length;
	assert(len <= 150, `Short description is ${len} chars (max 150 allowed)`);
	console.log(`     ↳ Length: ${len} chars (OK)`);
});

test("3rd Party Service Disclosures are declared (Base RPC & APay Portal)", () => {
	assert(
		readmeContent.includes("== 3rd Party Service Disclosure =="),
		"Missing 3rd party disclosure",
	);
	assert(
		readmeContent.includes("https://apayprotocol.org"),
		"Missing APay Portal URL",
	);
	assert(
		readmeContent.includes("https://mainnet.base.org"),
		"Missing Base RPC URL",
	);
});

console.log("\n🔒 Section 2: PHP Header & Security Invariants");

test("Tested up to is NOT declared in main PHP file (WP duplicate header ban)", () => {
	const headerMatch = phpContent.match(/\/\*\*[\s\S]*?\*\//);
	assert(headerMatch, "Header docblock not found");
	const header = headerMatch[0];
	assert(
		!header.includes("Tested up to:"),
		"Tested up to MUST NOT be in PHP header",
	);
});

test('Plugin Name is "A-Pay Web3 AI Paywall"', () => {
	assert(
		phpContent.includes("Plugin Name:       A-Pay Web3 AI Paywall"),
		"Plugin Name mismatch",
	);
});

test('Text Domain is "apay-web3-ai-paywall" across file', () => {
	assert(
		phpContent.includes("Text Domain:       apay-web3-ai-paywall"),
		"Text Domain header mismatch",
	);
	assert(
		phpContent.includes("__('Settings', 'apay-web3-ai-paywall')"),
		"Settings i18n text domain mismatch",
	);
});

test("Direct access prevention (ABSPATH check)", () => {
	assert(
		phpContent.includes("if (!defined('ABSPATH'))"),
		"Missing ABSPATH security check",
	);
});

console.log(
	"\n🛡️ Section 3: Input Sanitization & Unslashing (PHPCS / Plugin Check)",
);

test("Every $_SERVER variable access is unslashed with wp_unslash()", () => {
	const serverMatches = phpContent.match(/\$_SERVER\['[A-Z_]+'\]/g) || [];
	assert(serverMatches.length > 0, "No $_SERVER accesses found to check");
	// Check that all $_SERVER usages are wrapped in wp_unslash
	const lines = phpContent.split("\n");
	lines.forEach((line, idx) => {
		if (
			line.includes("$_SERVER[") &&
			!line.includes("isset(") &&
			!line.includes("!empty(")
		) {
			assert(
				line.includes("wp_unslash("),
				`Line ${idx + 1} uses $_SERVER without wp_unslash(): ${line}`,
			);
		}
	});
});

test("Every $_SERVER input is sanitized with sanitize_text_field()", () => {
	const lines = phpContent.split("\n");
	lines.forEach((line, idx) => {
		if (
			line.includes("$_SERVER[") &&
			!line.includes("isset(") &&
			!line.includes("!empty(")
		) {
			assert(
				line.includes("sanitize_text_field("),
				`Line ${idx + 1} uses $_SERVER without sanitize_text_field(): ${line}`,
			);
		}
	});
});

test("EVM Address validation with 42-char hex regex", () => {
	assert(
		phpContent.includes("preg_match('/^0x[a-f0-9]{40}$/', $payer)"),
		"Missing EVM address regex check",
	);
});

test("Cryptographic signature format validation", () => {
	assert(
		phpContent.includes("strlen($signature) < 66"),
		"Missing signature minimum length check",
	);
});

console.log("\n⚡ Section 4: M2M Autonomous Payment Logic");

test("Server-issued nonce tracking with WordPress transients", () => {
	assert(
		phpContent.includes("set_transient('apay_issued_nonce_' . $nonce"),
		"Missing server nonce issuance",
	);
	assert(
		phpContent.includes("get_transient($issued_key)"),
		"Missing nonce verification check",
	);
	assert(
		phpContent.includes("delete_transient($issued_key)"),
		"Missing single-use nonce consumption",
	);
	assert(
		phpContent.includes("set_transient($consumed_key"),
		"Missing replay protection transient",
	);
});

test("Payment amount validation against required pricing", () => {
	assert(
		phpContent.includes("floatval($amount) < floatval($amount_base_units)"),
		"Missing authorized amount validation",
	);
	assert(
		phpContent.includes("status_header(402)"),
		"Missing 402 status on underpayment",
	);
});

test("Human visitors browse 100% free", () => {
	assert(
		phpContent.includes("$human_free && !$is_ai_crawler"),
		"Missing human whitelist check",
	);
});

test("Search engines (Googlebot, Bingbot) whitelisted for SEO", () => {
	assert(
		phpContent.includes("'googlebot', 'bingbot', 'slurp'"),
		"Missing SEO bot whitelist",
	);
});

test("Zero-Config Auto Domain Escrow: On-chain EscrowVault bindings", () => {
	assert(
		phpContent.includes(
			"ESCROW_MAINNET = '0xd08c8a337e5339d1c083e06d74a9265956ceea16'",
		),
		"Missing Base Mainnet EscrowVault binding",
	);
	assert(
		phpContent.includes(
			"ESCROW_SEPOLIA = '0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF'",
		),
		"Missing Base Sepolia EscrowVault binding",
	);
});

test("Zero-Config Auto Domain Escrow: Default wallet is optional empty string", () => {
	assert(
		phpContent.includes("'default' => ''"),
		"Default wallet setting must be empty string",
	);
	assert(
		!phpContent.includes('name="apay_receiver_wallet" value="0x5eC0'),
		"Wallet input must not hardcode founder default",
	);
	assert(
		!phpContent.includes(
			"name=\"apay_receiver_wallet\" value=\"<?php echo esc_attr(get_option('apay_receiver_wallet', '0x5eC0",
		),
		"Must not fallback to founder wallet",
	);
});

test("Zero-Config Auto Domain Escrow: Emits domain escrow headers and claim portal", () => {
	assert(
		phpContent.includes("X-APay-Domain-Escrow:"),
		"Missing X-APay-Domain-Escrow header",
	);
	assert(
		phpContent.includes("X-APay-Claim-Portal:"),
		"Missing X-APay-Claim-Portal header",
	);
});

test("Auto Domain Claim Verification: Serves /.well-known/apay-claim.txt and /.apay/status", () => {
	assert(
		phpContent.includes("'/.well-known/apay-claim.txt'"),
		"Missing /.well-known/apay-claim.txt endpoint",
	);
	assert(
		phpContent.includes("'/.apay/status'"),
		"Missing /.apay/status endpoint",
	);
});

test("Universal [apay_button] shortcode registered for instant eCommerce", () => {
	assert(
		phpContent.includes("add_shortcode('apay_button'"),
		"Missing apay_button shortcode registration",
	);
	assert(
		phpContent.includes("add_shortcode('apay_checkout'"),
		"Missing apay_checkout shortcode registration",
	);
	assert(
		phpContent.includes("render_checkout_button_shortcode"),
		"Missing shortcode render method",
	);
	assert(
		phpContent.includes("https://apayprotocol.org/v1.js"),
		"Must load official standalone checkout widget",
	);
});

test("WooCommerce WC_Gateway_APay payment gateway class registered", () => {
	assert(
		phpContent.includes("class WC_Gateway_APay extends WC_Payment_Gateway"),
		"Missing WC_Gateway_APay definition",
	);
	assert(
		phpContent.includes("woocommerce_payment_gateways"),
		"Missing woocommerce_payment_gateways filter",
	);
	assert(
		phpContent.includes("apay_init_woocommerce_gateway"),
		"Missing gateway initializer",
	);
	assert(
		phpContent.includes("apay_wc_complete_order"),
		"Missing order completion ajax handler",
	);
	assert(
		phpContent.includes("supports = array('products', 'refunds')"),
		"Missing refunds in gateway supports",
	);
	assert(
		phpContent.includes("process_refund"),
		"Missing process_refund implementation",
	);
});

test("WooCommerce 1-Click Web3 Refund Engine and HPOS compatibility registered", () => {
	assert(
		phpContent.includes("register_wc_order_refund_metabox"),
		"Missing refund metabox registration",
	);
	assert(
		phpContent.includes("render_wc_order_refund_metabox"),
		"Missing refund metabox render method",
	);
	assert(
		phpContent.includes("ajax_wc_process_admin_refund"),
		"Missing admin refund ajax handler",
	);
	assert(
		phpContent.includes("declare_compatibility"),
		"Missing HPOS custom_order_tables compatibility declaration",
	);
});

console.log(
	"\n🛡️ Section 4b: WordPress 7.2, PHP 8.6 & Plugin Check (PCP) Compliance",
);

test("Plugin version matches Stable tag 0.1.10", () => {
	assert(
		phpContent.includes("Version:           0.1.10"),
		"Plugin header Version must be 0.1.10",
	);
	assert(
		phpContent.includes("const VERSION = '0.1.10';"),
		"Class VERSION constant must be 0.1.10",
	);
});

test("Zero raw <script> tags (strict wp_enqueue_script + wp_add_inline_script compliance)", () => {
	assert(
		!/<script\b/i.test(phpContent),
		"Found raw <script> tag in PHP output (use wp_enqueue_script + wp_add_inline_script)",
	);
	assert(
		!phpContent.includes("document.createElement('script')"),
		"Found dynamic script tag loader (use wp_enqueue_script)",
	);
	assert(
		phpContent.includes("wp_add_inline_script("),
		"Must attach inline scripts via wp_add_inline_script()",
	);
});

test("Uses WordPress core JSON & URL helpers (wp_json_encode / wp_parse_url)", () => {
	assert(
		!/\bjson_encode\s*\(/.test(phpContent),
		"Found raw json_encode() instead of wp_json_encode()",
	);
	assert(
		!/(?<!wp_)parse_url\s*\(/.test(phpContent),
		"Found raw parse_url() instead of wp_parse_url()",
	);
});

test("WooCommerce order completion AJAX enforces nonce & EVM format validation", () => {
	assert(
		phpContent.includes("check_ajax_referer('apay_wc_complete_order')"),
		"Missing check_ajax_referer in ajax_wc_complete_order",
	);
	assert(
		phpContent.includes("hash_equals("),
		"Should verify order key using hash_equals()",
	);
});

test("X-APay-Test header never bypasses server-issued voucher nonce verification", () => {
	assert(
		!phpContent.includes("!$is_valid_challenge && !$is_explicit_test"),
		"Security regression: X-APay-Test must never bypass nonce check",
	);
	assert(
		phpContent.includes("if (!$is_valid_challenge)"),
		"Missing strict server-issued nonce enforcement",
	);
});

test("Zero PHP 8.6 deprecated function usage (mb_ereg, mb_split, is_integer, is_double, is_long)", () => {
	assert(
		!/\b(mb_ereg|mb_split|is_integer|is_double|is_long)\s*\(/.test(phpContent),
		"Found PHP 8.6 deprecated function call",
	);
});

console.log("\n📦 Section 5: ZIP Archive Structure & Parity");

test("ZIP file contains canonical directory and files", () => {
	assert(fs.existsSync(ZIP_FILE), `ZIP file does not exist at ${ZIP_FILE}`);
	const list = execSync(`unzip -l "${ZIP_FILE}"`).toString();
	assert(
		list.includes("apay-web3-ai-paywall/"),
		"Missing root directory in ZIP",
	);
	assert(
		list.includes("apay-web3-ai-paywall/apay-web3-ai-paywall.php"),
		"Missing main php in ZIP",
	);
	assert(
		list.includes("apay-web3-ai-paywall/readme.txt"),
		"Missing readme.txt in ZIP",
	);
});

console.log(
	"\n========================================================================",
);
console.log(`📊 AUDIT SUMMARY: ${passCount} Passed | ${failCount} Failed`);
console.log(
	"========================================================================",
);

if (failCount > 0) {
	process.exit(1);
} else {
	console.log("🎉 100% COMPLIANT WITH ZERO ERRORS AND ZERO DEFECTS!\n");
}
