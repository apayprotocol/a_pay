=== A-Pay Web3 AI Paywall ===
Contributors: apay98, apayprotocol, sagarofficial
Tags: ai-paywall, web3, monetization, gptbot, micropayments
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.8
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Universal HTTP 402 Web3 AI paywall for WordPress. Monetize GPTBot, ClaudeBot, and AI crawlers on Base L2 while humans browse 100% free.

== Description ==

**A-Pay Web3 AI Paywall** is an HTTP 402 Web3 micropayment gatekeeper for WordPress & WooCommerce that allows website owners to monetize autonomous AI crawlers, scrapers, and LLM bots (OpenAI GPTBot, Anthropic ClaudeBot, PerplexityBot, ByteSpider, and Meta-ExternalAgent) on Base Layer 2.

### 🌟 Key Features

* **100% Free for Real Humans**: Human visitors on desktop and mobile web browsers (Chrome, Safari, Firefox, Edge) browse your site completely free without any paywalls, popups, or captchas.
* **SEO Protected**: Googlebot, Bingbot, DuckDuckBot, and other search engines are automatically whitelisted so your search rankings and indexing remain completely intact.
* **HTTP 402 Web3 Challenge Gate**: Autonomous AI crawlers are presented with a cryptographic HTTP 402 Payment Required challenge specifying Base Layer 2 settlement details under EIP-712 standards.
* **Voucher & Nonce Verification**: Validates incoming Authorization headers, strictly checks payment amounts against required pricing, verifies EVM address formats, and enforces single-use session nonces to prevent replay attacks.
* **Dual Settlement Rails**: Accept USDC (Circle native) or $APAY protocol tokens on Base Mainnet (Chain ID 8453) or Base Sepolia Testnet (Chain ID 84532).
* **Instant WordPress Setup**: Zero complex coding required. Simply install, activate, paste your Base wallet address, and your content is protected immediately.

== 3rd Party Service Disclosure ==

This plugin interacts with external decentralized infrastructure and protocols to facilitate autonomous payments:

1. **A-Pay Protocol Portal & Telemetry (`https://apay-network.vercel.app`)**:
   * **Purpose**: Provides developer protocol documentation, health probes, token contract verification, and EIP-712 scheme metadata.
   * **Terms of Service**: https://apay-network.vercel.app
   * **Privacy Policy**: https://apay-network.vercel.app

2. **Base Layer 2 Decentralized Network (`https://mainnet.base.org` / `https://sepolia.base.org`)**:
   * **Purpose**: Used for on-chain cryptographic transaction verification and router contract settlement (`0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6`).
   * **Terms of Service**: https://base.org

== Installation ==

1. Upload the `apay-web3-ai-paywall` folder to the `/wp-content/plugins/` directory, or install the plugin directly through the WordPress plugins screen.
2. Activate the plugin through the **Plugins** screen in WordPress.
3. Navigate to **Settings -> A-Pay Web3 AI Paywall**.
4. Enter your Base L2 EVM wallet address to receive payments.
5. Choose your pricing (default: $0.001 USDC / 4.0 $APAY) and save changes.

== Frequently Asked Questions ==

= Will this plugin block my regular website visitors? =
No. Regular human visitors browsing with desktop or mobile browsers are completely whitelisted and will never see paywalls, captchas, or payment prompts.

= Will this affect my Google Search SEO ranking? =
No. Googlebot, Bingbot, DuckDuckBot, and verified search engine crawlers are automatically whitelisted so your SEO rankings and search previews remain unaffected.

= Which AI bots are challenged with HTTP 402? =
By default, the plugin identifies: `gptbot`, `chatgpt-user`, `claudebot`, `claude-web`, `anthropic-ai`, `perplexitybot`, `bytespider`, `ccbot`, `google-extended`, `cohere-ai`, `diffbot`, `facebookbot`, `omgilibot`, `applebot-extended`, `meta-externalagent`, `amazonbot`, `timpibot`, and `youbot`. You can also add custom bot user-agents in Settings.

= Do I need a credit card or bank account? =
No. Micropayments settle directly to your non-custodial EVM wallet address on Base L2.

== Screenshots ==

1. A-Pay Web3 AI Paywall Settings screen in WordPress Admin.
2. Live HTTP 402 Machine-to-Machine payment challenge received by automated AI bots.

== Changelog ==

= 0.1.8 =
* Renamed plugin display name and slug to A-Pay Web3 AI Paywall.
* Strictly sanitize and unslash all HTTP request headers and authorization inputs.
* Added server-side nonce issuing and single-use validation to prevent voucher replay.
* Added minimum payment amount validation against required pricing.
* Removed duplicate Tested up to header from main PHP file.
* Limited tags to 5 directory-compliant tags and short description to 135 characters.
