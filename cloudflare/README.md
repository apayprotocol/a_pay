# ⚡ A-Pay Cloudflare Edge Paywall

Monetize AI crawlers, LLM data scrapers, and autonomous agents at Cloudflare's global edge without changing a single line of your website's source code.

---

## 🌟 How It Works

* **Human Visitors**: Standard users browsing via Chrome, Safari, Firefox, or Edge browse your website **100% free and uninterrupted**.
* **AI Scrapers (OpenAI GPTBot, Anthropic ClaudeBot, Perplexity, etc.)**: Intercepted at Cloudflare's edge and served an **HTTP 402 Payment Required** challenge.
* **Autonomous Micro-Settlement**: The AI bot signs an EIP-712 payment voucher for the requested content. Funds are routed directly to your Base L2 wallet.

---

## 🚀 2-Minute Setup Guide

### Method 1: Cloudflare Dashboard (Zero Code / 1-Click)

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Create Worker**.
3. Name your worker (e.g. `apay-paywall`).
4. Click **Deploy**, then click **Edit code**.
5. Paste the entire contents of [`worker.js`](./worker.js) into the editor.
6. Go to **Settings** $\rightarrow$ **Variables** and add:
   * `RECEIVER_WALLET`: Your Base / Ethereum wallet address (`0x...`).
   * `PRICE_USDC`: Price per request in USDC (e.g. `0.001`).
   * `MONETIZE_AI_ONLY`: `true`.
7. Go to your domain $\rightarrow$ **Workers Routes** $\rightarrow$ **Add Route**:
   * Route: `yourdomain.com/*`
   * Worker: `apay-paywall`
8. 🎉 **Done!** Every AI bot scraping your website is now automatically monetized!

---

### Method 2: Command Line via Wrangler CLI

```bash
# Install wrangler if not already installed
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Deploy directly from the cloudflare directory
cd cloudflare
wrangler deploy
```

---

## ⚙️ Configuration Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `RECEIVER_WALLET` | `0x5eC...` | Your Base wallet address where USDC proceeds are collected. |
| `PRICE_USDC` | `0.001` | Price in USDC per request ($0.001 = 1/10th of a cent). |
| `CURRENCY` | `USDC` | Settlement token currency (`USDC` or `APAY`). |
| `NETWORK` | `base` | Base L2 settlement rail (`base` or `base-sepolia`). |
| `MONETIZE_AI_ONLY` | `true` | When `true`, human visitors browse free; only AI crawlers pay. |
| `APAY_NONCE_KV` | *(Optional)* | Cloudflare KV binding for edge-native nonce replay defense. |

---

## 🔍 Verification

Test your worker endpoint using curl:

```bash
# 1. Normal human browser (Browses free)
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://yourdomain.com/

# 2. AI Scraper simulation (Receives HTTP 402 Challenge)
curl -i -H "User-Agent: Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)" https://yourdomain.com/

# 3. Protocol status check
curl https://yourdomain.com/.apay/status
```
