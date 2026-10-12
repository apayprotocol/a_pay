#!/usr/bin/env node
/**
 * ⚡ A-PAY PROTOCOL: AUTOMATED WEB & WIDGET END-TO-END (E2E) TEST SUITE
 * 
 * Verifies all live Next.js HTTP API routes, serverless edge functions,
 * rate limiters, cryptographic voucher generation, and static widget assets.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'web');

const TEST_PORT = 3108;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('========================================================================');
console.log('⚡ A-PAY PROTOCOL: WEB & WIDGET END-TO-END (E2E) INTEGRATION SUITE');
console.log('========================================================================');
console.log(`📡 Target Test Server: ${BASE_URL}\n`);

let serverProcess = null;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runStep(name, fn) {
  process.stdout.write(`  • [${name}] ... `);
  const start = performance.now();
  try {
    await fn();
    const duration = Math.round(performance.now() - start);
    console.log(`✅ PASS (${duration}ms)`);
    testsPassed++;
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    console.log(`❌ FAIL (${duration}ms)`);
    console.error(`    ↳ Error: ${err.message}`);
    testsFailed++;
  }
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/ping`);
      if (res.status === 200) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log('🚀 Spawning production Next.js instance on port ' + TEST_PORT + '...');

  serverProcess = spawn('npx', ['next', 'start', '-p', String(TEST_PORT)], {
    cwd: WEB_DIR,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(TEST_PORT), APAY_ALLOW_LOCALHOST: 'true' },
  });

  serverProcess.stderr.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('Error')) {
      console.error(`[Server stderr] ${msg.trim()}`);
    }
  });

  const isReady = await waitForServer();
  if (!isReady) {
    console.error('❌ Failed to connect to Next.js test server within timeout.');
    if (serverProcess) serverProcess.kill('SIGTERM');
    process.exit(1);
  }

  console.log('🟢 Next.js server operational! Starting test execution...\n');

  // =====================================================================
  // 1. HEALTH & PING API TESTS
  // =====================================================================
  console.log('📡 1. Diagnostic & Healthcheck API (/api/ping):');

  await runStep('GET /api/ping returns healthy status', async () => {
    const res = await fetch(`${BASE_URL}/api/ping`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'healthy', 'Expected status to be healthy');
    assert(data.protocol === 'A-Pay', 'Expected protocol to be A-Pay');
    assert(typeof data.timestamp === 'number', 'Expected valid timestamp');
  });

  await runStep('POST /api/ping handles invalid URL format', async () => {
    const res = await fetch(`${BASE_URL}/api/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-valid-url' }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error && data.error.includes('Invalid URL'), 'Expected Invalid URL error message');
  });

  // =====================================================================
  // 2. BASE SEPOLIA TESTNET FAUCET API
  // =====================================================================
  console.log('\n💧 2. Base Sepolia Testnet Faucet API (/api/faucet):');

  const testWallet = '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc';

  await runStep('POST /api/faucet rejects invalid EVM address', async () => {
    const res = await fetch(`${BASE_URL}/api/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: '0xinvalid_evm_address' }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('Invalid or missing EVM'), 'Expected EVM validation error');
  });

  await runStep('POST /api/faucet dispenses 50 testnet $APAY', async () => {
    const res = await fetch(`${BASE_URL}/api/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testWallet, network: 'base-sepolia' }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.amount === '50', 'Expected 50 tokens');
    assert(data.currency === '$APAY', 'Expected $APAY currency');
    assert(data.chainId === 84532, 'Expected Base Sepolia chainId 84532');
    assert(typeof data.txHash === 'string' && data.txHash.startsWith('0x'), 'Expected valid txHash');
  });

  await runStep('POST /api/faucet enforces 6-hour rate-limit cooldown', async () => {
    const res = await fetch(`${BASE_URL}/api/faucet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testWallet, network: 'base-sepolia' }),
    });
    assert(res.status === 429, `Expected HTTP 429 Too Many Requests, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('Faucet cooldown active'), 'Expected cooldown message');
    assert(data.remainingCooldownMinutes > 0, 'Expected positive remainingCooldownMinutes');
  });

  // =====================================================================
  // 3. GENESIS AUTONOMOUS AGENT SIMULATOR API
  // =====================================================================
  console.log('\n🤖 3. Genesis Autonomous AI Agent API (/api/genesis-call):');

  await runStep('POST /api/genesis-call rejects missing targetUrl or receiverWallet', async () => {
    const res = await fetch(`${BASE_URL}/api/genesis-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'https://api.domain.com' }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
  });

  await runStep('POST /api/genesis-call executes EIP-712 cryptographic voucher signing', async () => {
    const res = await fetch(`${BASE_URL}/api/genesis-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: 'http://127.0.0.1:3108/api/ping',
        receiverWallet: testWallet,
        priceApay: '4.0',
        priceUsdc: '0.001',
        currency: 'DUAL',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.genesisCall, 'Expected genesisCall payload');
    assert(data.genesisCall.agentAddress.startsWith('0x'), 'Expected valid agent EVM address');
    assert(data.genesisCall.signature.startsWith('0x'), 'Expected valid cryptographic signature');
    assert(data.genesisCall.nonce.length > 10, 'Expected non-empty nonce');
    assert(data.welcomeGrant, 'Expected welcomeGrant payload');
    assert(data.welcomeGrant.grantAmount === '10.0', 'Expected 10.0 grant amount');
  });

  // =====================================================================
  // 4. PROTOCOL REGISTRY API
  // =====================================================================
  console.log('\n🌐 4. M2M Protocol Registry & Telemetry (/api/registry):');

  await runStep('POST /api/registry registers a new merchant paywall', async () => {
    const res = await fetch(`${BASE_URL}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: testWallet,
        targetDomain: 'https://e2e-test-merchant.apayprotocol.org/api',
        price: '0.002 USDC',
        network: 'base-sepolia',
        version: '0.1.8',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.registered === true, 'Expected registered === true');
    assert(data.totalRegistered >= 1, 'Expected totalRegistered >= 1');
  });

  await runStep('GET /api/registry returns active service directory', async () => {
    const res = await fetch(`${BASE_URL}/api/registry?public=true`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.services), 'Expected services array');
    assert(data.services.length >= 1, 'Expected at least 1 service');
  });

  // =====================================================================
  // 5. WEBHOOK DISPATCHER API
  // =====================================================================
  console.log('\n🔔 5. Developer Webhook Dispatcher API (/api/webhook-dispatch):');

  await runStep('POST /api/webhook-dispatch validates webhookUrl format', async () => {
    const res = await fetch(`${BASE_URL}/api/webhook-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: 'invalid-url' }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
  });

  await runStep('POST /api/webhook-dispatch calculates HMAC-SHA256 signature', async () => {
    // Dispatch to local ping endpoint
    const res = await fetch(`${BASE_URL}/api/webhook-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: `${BASE_URL}/api/ping`,
        amount: '15.00',
        currency: 'USDC',
        secretKey: 'sk_test_secret_for_e2e',
        orderId: 'ord_e2e_123',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.signature && data.signature.startsWith('sha256='), 'Expected valid HMAC signature');
    assert(data.sentPayload.data.amount === '15.00', 'Expected amount match');
    assert(data.sentPayload.event === 'payment.successful', 'Expected payment.successful event');
  });

  // =====================================================================
  // 6. MODEL CONTEXT PROTOCOL (MCP) RUNTIME API
  // =====================================================================
  console.log('\n🧠 6. Model Context Protocol (MCP) Runtime (/api/mcp):');

  await runStep('OPTIONS /api/mcp provides CORS headers for Claude/Cursor', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, { method: 'OPTIONS' });
    assert(res.status === 204, `Expected status 204, got ${res.status}`);
    assert(res.headers.get('Access-Control-Allow-Origin') === '*', 'Expected open CORS');
  });

  await runStep('GET /api/mcp returns MCP server catalog and available tools', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.serverInfo && data.serverInfo.name === 'apay-mcp', 'Expected apay-mcp serverInfo');
    assert(Array.isArray(data.tools), 'Expected tools array');
    const toolNames = data.tools.map((t) => t.name);
    assert(toolNames.includes('apay_request'), 'Expected apay_request tool');
    assert(toolNames.includes('apay_get_wallet_status'), 'Expected apay_get_wallet_status tool');
    assert(toolNames.includes('apay_set_budget'), 'Expected apay_set_budget tool');
  });

  // =====================================================================
  // 7. STANDALONE CHECKOUT WIDGET & STATIC ASSETS
  // =====================================================================
  console.log('\n📦 7. Standalone Checkout Widget & Client Assets:');

  await runStep('GET /v1.js serves compiled widget (< 50KB budget)', async () => {
    const res = await fetch(`${BASE_URL}/v1.js`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    const sizeBytes = Buffer.byteLength(text, 'utf8');
    assert(sizeBytes > 5000, `Expected non-empty script (>5KB), got ${sizeBytes} bytes`);
    assert(sizeBytes <= 51200, `Widget exceeded 50KB budget: ${sizeBytes} bytes`);
    assert(text.includes('APay') || text.includes('checkout'), 'Expected APay export in bundle');
  });

  await runStep('GET /checkout.js is accessible as mirror bundle', async () => {
    const res = await fetch(`${BASE_URL}/checkout.js`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
  });

  await runStep('GET /checkout-demo renders interactive showcase page', async () => {
    const res = await fetch(`${BASE_URL}/checkout-demo`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('A-Pay') || html.includes('checkout'), 'Expected HTML content');
  });

  await runStep('GET / renders main dashboard console with Docs Tab', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const html = await res.text();
    assert(html.includes('<!DOCTYPE html>'), 'Expected valid HTML document');
  });

  // =====================================================================
  // 8. HIGH-AVAILABILITY SERVERLESS RPC RELAY
  // =====================================================================
  console.log('\n⚡ 8. High-Availability Serverless RPC Relay (/api/rpc):');

  await runStep('OPTIONS /api/rpc provides CORS headers', async () => {
    const res = await fetch(`${BASE_URL}/api/rpc`, { method: 'OPTIONS' });
    assert(res.status === 204, `Expected status 204, got ${res.status}`);
    assert(res.headers.get('Access-Control-Allow-Origin') === '*', 'Expected open CORS');
  });

  await runStep('GET /api/rpc returns relay health status', async () => {
    const res = await fetch(`${BASE_URL}/api/rpc`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'healthy', 'Expected status to be healthy');
    assert(data.service.includes('RPC Relay'), 'Expected RPC Relay in service name');
    assert(Array.isArray(data.supportedNetworks), 'Expected supportedNetworks array');
  });

  await runStep('POST /api/rpc proxies eth_blockNumber with server cache', async () => {
    const rpcReq = {
      jsonrpc: '2.0',
      id: 42,
      method: 'eth_blockNumber',
      params: [],
    };
    // First call (cache miss or hit)
    const res1 = await fetch(`${BASE_URL}/api/rpc?network=base-mainnet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcReq),
    });
    assert(res1.status === 200, `Expected status 200, got ${res1.status}`);
    const data1 = await res1.json();
    assert(data1.result && data1.result.startsWith('0x'), `Expected hex blockNumber, got ${JSON.stringify(data1)}`);
    assert(data1.id === 42, 'Expected id match');

    // Second call (cache hit)
    const res2 = await fetch(`${BASE_URL}/api/rpc?network=base-mainnet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcReq),
    });
    assert(res2.status === 200, `Expected status 200, got ${res2.status}`);
    const cacheHeader = res2.headers.get('X-APay-RPC-Cache');
    assert(cacheHeader === 'HIT', `Expected cache HIT header, got ${cacheHeader}`);
  });

  // =====================================================================
  // 9. COMMUNITY SUPPORT & DEV FORUM API TESTS (/api/community)
  // =====================================================================
  console.log('\n💬 9. Community Support & Dev Forum API (/api/community):');

  let testThreadId = null;

  await runStep('GET /api/community returns seeded threads array', async () => {
    const res = await fetch(`${BASE_URL}/api/community`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(Array.isArray(data.threads), 'Expected threads to be an array');
    assert(data.threads.length >= 3, 'Expected at least 3 initial/seeded threads');
    const t = data.threads[0];
    assert(t.id && t.title && t.category && t.authorWallet, 'Thread missing required fields');
  });

  await runStep('GET /api/community with category filter', async () => {
    const res = await fetch(`${BASE_URL}/api/community?category=Integration`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    for (const t of data.threads) {
      assert(t.category === 'Integration', `Expected category Integration, got ${t.category}`);
    }
  });

  await runStep('POST /api/community creates new developer thread', async () => {
    const res = await fetch(`${BASE_URL}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_thread',
        title: 'E2E Automated Test Question: Verifying Thread Creation',
        category: 'Integration',
        content: 'Testing automated community discussion thread creation with real-world verification.',
        author: '0x000000000000000000000000000000000000e2e1',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.thread && data.thread.id, 'Expected returned thread with id');
    testThreadId = data.thread.id;
  });

  await runStep('POST /api/community adds reply to thread', async () => {
    assert(testThreadId, 'testThreadId must be defined');
    const res = await fetch(`${BASE_URL}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_reply',
        threadId: testThreadId,
        content: 'This is an automated E2E solution reply confirming threading and response flow.',
        author: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
      }),
    });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.reply && data.reply.id, 'Expected reply object');
    assert(data.reply.isSolution === true, 'Founder reply should be marked as solution');
  });

  await runStep('POST /api/community toggles like on thread', async () => {
    assert(testThreadId, 'testThreadId must be defined');
    const res = await fetch(`${BASE_URL}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_like',
        threadId: testThreadId,
        userAddress: '0x000000000000000000000000000000000000e2e2',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.likes >= 1, 'Expected likes >= 1');
  });

  await runStep('POST /api/community creates thread with up to 3 attached screenshots', async () => {
    const sampleImage1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const sampleImage2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const sampleImage3 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwGAi3oGtwAAAABJRU5ErkJggg==';

    const res = await fetch(`${BASE_URL}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_thread',
        title: 'Developer Bug Report with 3 Screenshot Attachments',
        category: 'Bug & Issues',
        content: 'Investigating HTTP 402 challenge header replay verification with attached terminal logs and Network inspector screenshots.',
        author: '0x000000000000000000000000000000000000e2e3',
        network: 'base-sepolia',
        images: [sampleImage1, sampleImage2, sampleImage3],
      }),
    });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success === true');
    assert(data.thread && data.thread.id, 'Expected returned thread with id');
    assert(Array.isArray(data.thread.images), 'Expected images array');
    assert(data.thread.images.length === 3, 'Expected exactly 3 attached screenshots');
  });

  await runStep('POST /api/community rejects thread with more than 3 screenshots with 400 Bad Request', async () => {
    const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await fetch(`${BASE_URL}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_thread',
        title: 'Test Exceeding Screenshot Limit Rejection',
        category: 'Bug & Issues',
        content: 'This thread attempts to attach 4 screenshots, which should strictly fail with 400 Bad Request.',
        author: '0x000000000000000000000000000000000000e2e4',
        images: [sampleImage, sampleImage, sampleImage, sampleImage],
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error && data.error.includes('Maximum 3 screenshots allowed'), 'Expected 3 screenshots limit error message');
  });

  await runStep('POST /api/community rejects invalid image format with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/community`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_thread',
        title: 'Test Invalid Image Format Rejection',
        category: 'Bug & Issues',
        content: 'This thread attempts to attach an invalid non-image string.',
        author: '0x000000000000000000000000000000000000e2e5',
        images: ['javascript:alert(1)'],
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error && data.error.includes('not a valid format'), 'Expected invalid format error message');
  });

  // =====================================================================
  // 10. AI AGENT & LLM DISCOVERY STANDARDS (/llms.txt & /robots.txt)
  // =====================================================================
  console.log('\n🤖 10. AI Agent & LLM Discovery Standards (/llms.txt & /robots.txt):');

  await runStep('GET /llms.txt serves standard LLM context', async () => {
    const res = await fetch(`${BASE_URL}/llms.txt`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('Human Visitors Browse 100% FREE'), 'Missing free human browsing guarantee');
    assert(text.includes('Pillar 1: M2M AI Paywall'), 'Missing Pillar 1 definition');
    assert(text.includes('Pillar 2: Agent Vaults'), 'Missing Pillar 2 definition');
    assert(text.includes('Pillar 3: H2M A-Pay Checkout Gateway'), 'Missing Pillar 3 definition');
    assert(text.includes('blog?issue=paywalls'), 'Missing Pillar 1 blog link');
    assert(text.includes('blog?issue=vaults'), 'Missing Pillar 2 blog link');
    assert(text.includes('blog?issue=checkout'), 'Missing Pillar 3 blog link');
  });

  await runStep('GET /llms-full.txt serves exhaustive technical spec', async () => {
    const res = await fetch(`${BASE_URL}/llms-full.txt`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('PaymentAuthorization'), 'Missing EIP-712 schema');
    assert(text.includes('0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3'), 'Missing mainnet token address');
  });

  await runStep('GET /robots.txt includes AI crawler directives and llms.txt pointers', async () => {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('llms.txt'), 'robots.txt must point to llms.txt');
    assert(text.includes('GPTBot') && text.includes('ClaudeBot'), 'robots.txt must declare AI bot permissions');
  });

  await runStep('GET /?tab=aiguidelines renders AI Guidelines tab console', async () => {
    const res = await fetch(`${BASE_URL}/?tab=aiguidelines`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('AI AGENT') || text.includes('A-Pay'), 'Expected console markup');
  });

  // =====================================================================
  // 11. PILLAR 1: M2M AI PAYWALL END-TO-END PUBLISHING & DOWNLOADS
  // =====================================================================
  console.log('\n⚡ 11. Pillar 1: M2M AI Paywall End-to-End Publishing & Downloads:');

  await runStep('GET /api/download serves dynamic WordPress plugin', async () => {
    const res = await fetch(`${BASE_URL}/api/download?platform=wordpress&wallet=0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc&currency=DUAL`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const disp = res.headers.get('content-disposition') || '';
    assert(disp.includes('apay-paywall.php'), 'Expected filename apay-paywall.php');
    const text = await res.text();
    assert(text.includes('A-Pay Protocol M2M AI Paywall'), 'Expected plugin name in header');
    assert(text.includes('APay eip712:'), 'Expected EIP-712 challenge verification');
    assert(text.includes('0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc'), 'Expected wallet address bound');
  });

  await runStep('GET /api/download serves dynamic Cloudflare worker', async () => {
    const res = await fetch(`${BASE_URL}/api/download?platform=cloudflare&wallet=0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('export default'), 'Expected Cloudflare ES module worker');
    assert(text.includes('AI_CRAWLER_USER_AGENTS'), 'Expected bot catalog');
  });

  await runStep('GET /api/download serves dynamic Docker compose', async () => {
    const res = await fetch(`${BASE_URL}/api/download?platform=docker&wallet=0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('apay/gateway:latest'), 'Expected gateway image in compose');
  });

  await runStep('GET /api/download serves dynamic Next.js middleware', async () => {
    const res = await fetch(`${BASE_URL}/api/download?platform=nextjs&wallet=0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('NextRequest'), 'Expected Next.js middleware signature');
  });

  await runStep('GET /api/download serves dynamic FastAPI main.py', async () => {
    const res = await fetch(`${BASE_URL}/api/download?platform=fastapi&wallet=0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('@apay_protect'), 'Expected @apay_protect decorator');
  });

  await runStep('GET /downloads/apay-paywall.php serves static production WordPress plugin', async () => {
    const res = await fetch(`${BASE_URL}/downloads/apay-paywall.php`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const text = await res.text();
    assert(text.includes('class APayWordPressPaywall'), 'Expected APayWordPressPaywall class definition');
    assert(text.includes('Settings -> A-Pay AI Paywall'), 'Expected settings hook');
  });

  await runStep('GET /downloads/apay-paywall.zip serves production WordPress submission package', async () => {
    const res = await fetch(`${BASE_URL}/downloads/apay-paywall.zip`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1000, 'Expected non-empty zip bundle');
  });

  await runStep('GET /downloads/a-pay-protocol-m2m-ai-paywall.zip serves canonical WordPress submission package', async () => {
    const res = await fetch(`${BASE_URL}/downloads/a-pay-protocol-m2m-ai-paywall.zip`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1000, 'Expected non-empty canonical zip bundle');
  });

  await runStep('GET /downloads/apay98-autonomous-crawler-paywall.zip serves approved WordPress submission package', async () => {
    const res = await fetch(`${BASE_URL}/downloads/apay98-autonomous-crawler-paywall.zip`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1000, 'Expected non-empty approved zip bundle');
  });

  await runStep('GET /downloads/apay-web3-ai-paywall.zip serves A-Pay Web3 WordPress submission package', async () => {
    const res = await fetch(`${BASE_URL}/downloads/apay-web3-ai-paywall.zip`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1000, 'Expected non-empty apay-web3 zip bundle');
  });

  await runStep('Paywall creation directly publishes to M2M discovery directory', async () => {
    const testDomain = 'https://e2e-publisher-test.ai/api/v1';
    const regRes = await fetch(`${BASE_URL}/api/registry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
        targetDomain: testDomain,
        price: '4.0 $APAY / $0.001 USDC',
        network: 'base-sepolia',
        version: '0.1.8',
      }),
    });
    assert(regRes.status === 200, `Expected status 200, got ${regRes.status}`);

    const discoRes = await fetch(`${BASE_URL}/api/registry?public=true`);
    assert(discoRes.status === 200, `Expected status 200, got ${discoRes.status}`);
    const discoData = await discoRes.json();
    assert(discoData.success === true, 'Expected success === true');
    const found = discoData.services.some((s) => s.targetDomain.includes('e2e-publisher-test.ai'));
    assert(found === true, 'Newly registered paywall must be discovered by autonomous AI agents');
  });

  // =====================================================================
  // 12. BASESCAN SMART CONTRACT VERIFICATION & AUDIT APIS
  // =====================================================================
  console.log('\n🛡️ Step 12: BaseScan Smart Contract Verification & Audit Bundles');

  await runStep('GET /api/contracts returns verified contracts manifest', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.protocol === 'A-Pay Protocol', 'Expected protocol === A-Pay Protocol');
    assert(data.compiler.version === 'v0.8.28+commit.7893614a', 'Expected compiler v0.8.28');
    assert(data.networks.mainnet.chainId === 8453, 'Expected Mainnet chainId 8453');
    assert(data.networks.sepolia.chainId === 84532, 'Expected Sepolia chainId 84532');
    assert(data.networks.mainnet.contracts.APAYToken.address === '0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3', 'Mainnet token match');
  });

  await runStep('GET /api/contracts?network=base-mainnet filters network', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts?network=base-mainnet`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.network.chainId === 8453, 'Expected chainId 8453');
    assert(data.network.contracts.APayRouterV2.address === '0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854', 'Router V2 address match');
  });

  await runStep('GET /api/contracts?download=APAYToken&network=mainnet streams Standard-JSON', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts?download=APAYToken&network=mainnet`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const disposition = res.headers.get('content-disposition') || '';
    assert(disposition.includes('attachment'), 'Expected attachment header');
    const json = await res.json();
    assert(json.language === 'Solidity', 'Expected Solidity language');
    assert(json.sources['APAYToken.sol'] !== undefined, 'Expected APAYToken.sol source');
    assert(json.settings.viaIR === true, 'Expected viaIR: true for Mainnet APAYToken');
  });

  await runStep('GET /contracts/mainnet/APAYToken-standard-input.json serves static bundle', async () => {
    const res = await fetch(`${BASE_URL}/contracts/mainnet/APAYToken-standard-input.json`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const json = await res.json();
    assert(json.language === 'Solidity', 'Expected Solidity in static bundle');
    assert(json.settings.optimizer.runs === 200, 'Expected optimizer runs 200');
  });

  // =====================================================================
  // 13. AUTOMATED AERODROME DEX BUYBACK & BURN TELEMETRY (/api/burn-feed)
  // =====================================================================
  console.log('\n🔥 13. Automated Aerodrome Buyback & Burn Feed (/api/burn-feed):');

  await runStep('GET /api/burn-feed returns protocol burn stats & Aerodrome pool', async () => {
    const res = await fetch(`${BASE_URL}/api/burn-feed`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.totalBurnedApay > 0, 'Expected positive totalBurnedApay');
    assert(
      data.aerodromePool.address === '0x6933dd2B7D72d8561005E475AFa147E47A3c7777',
      'Expected Aerodrome pool match',
    );
    assert(Array.isArray(data.recentBurns), 'Expected recentBurns array');
    assert(data.recentBurns.length > 0, 'Expected seeded recent burns');
  });

  await runStep('POST /api/burn-feed records newly reported burn event', async () => {
    const burnPayload = {
      amount_burned_apay: 750.0,
      burn_usdc_allocated: 37.5,
      dex: 'Aerodrome vAMM',
      network: 'base',
      status: 'simulated',
    };
    const res = await fetch(`${BASE_URL}/api/burn-feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(burnPayload),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected recorded: true');
    assert(data.event.amountApay === 750.0, 'Expected event amount match');
    assert(data.event.dex === 'Aerodrome vAMM', 'Expected Aerodrome dex match');
  });

  // =====================================================================
  // 14. ANTI-SPAM STAKING & CHALLENGER SLASHING DISPUTE APIS (/api/dispute)
  // =====================================================================
  console.log('\n⚔️ 14. Anti-Spam Staking & Challenger Slashing Dispute API (/api/dispute):');

  await runStep('GET /api/dispute returns dispute stats and seeded dispute history', async () => {
    const res = await fetch(`${BASE_URL}/api/dispute`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.stats.totalSlashedApay > 0, 'Expected positive totalSlashedApay');
    assert(data.stats.totalBountiesPaidApay > 0, 'Expected positive bounties paid');
    assert(data.stats.totalBurnedApay > 0, 'Expected positive burned APAY');
    assert(Array.isArray(data.disputes), 'Expected disputes array');
    assert(data.disputes.length > 0, 'Expected seeded disputes');
  });

  await runStep('POST /api/dispute rejects missing or invalid fields', async () => {
    const res = await fetch(`${BASE_URL}/api/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentAddress: 'invalid-address' }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success: false');
  });

  await runStep('POST /api/dispute creates verified dispute with 50/50 bounty & burn', async () => {
    const disputePayload = {
      agentAddress: '0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C',
      challengerAddress: '0x8742017B7b3EA4F8AC08BC71f89A099b47B4334E',
      slashedAmountApay: 200.0,
      reason: 'E2E Test: Corrupted payload SHA-256 hash mismatch',
      category: 'CORRUPTED_PAYLOAD',
      network: 'base',
    };
    const res = await fetch(`${BASE_URL}/api/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(disputePayload),
    });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.dispute.slashedAmountApay === 200.0, 'Expected 200 slashed');
    assert(data.dispute.challengerBountyApay === 100.0, 'Expected 100 bounty');
    assert(data.dispute.burnedApay === 100.0, 'Expected 100 burned');
    assert(data.dispute.explorerUrl.includes('basescan.org/tx/'), 'Expected BaseScan link');
  });

  // =====================================================================
  // 15. GLOBAL M2M AI MARKETPLACE & LIVE API EXPLORER (/api/registry)
  // =====================================================================
  console.log('\n🌐 15. Global M2M AI Marketplace & Live API Explorer (/api/registry):');

  await runStep('GET /api/registry returns rich marketplace metadata & categories', async () => {
    const res = await fetch(`${BASE_URL}/api/registry?public=true`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.services), 'Expected services array');
    assert(data.services.length >= 6, 'Expected at least 6 curated & registered services');
    const first = data.services[0];
    assert(first.category, 'Expected service to have category');
    assert(first.provider, 'Expected service to have provider name');
    assert(Array.isArray(first.tags), 'Expected service to have tags');
    assert(first.samplePayload, 'Expected service to have samplePayload');
  });

  await runStep('GET /api/registry filters by category (e.g. FINANCE)', async () => {
    const res = await fetch(`${BASE_URL}/api/registry?category=FINANCE`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.services), 'Expected services array');
    assert(data.services.length >= 1, 'Expected at least 1 FINANCE service');
    for (const s of data.services) {
      assert(s.category.toUpperCase() === 'FINANCE', `Expected category FINANCE, got ${s.category}`);
    }
  });

  await runStep('GET /api/registry filters by search keyword and bonded flag', async () => {
    const res = await fetch(`${BASE_URL}/api/registry?search=DeepSeek&bonded=true`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.services), 'Expected services array');
    assert(data.services.length >= 1, 'Expected at least 1 DeepSeek service');
    assert(data.services[0].bonded === true || data.services[0].isBonded === true, 'Expected bonded true');
  });

  // =====================================================================
  // 16. AUTONOMOUS AGENT PLAYGROUND & PAID API CHATBOT (/api/playground)
  // =====================================================================
  console.log('\n🤖 16. Autonomous Agent Playground & Paid API Chatbot (/api/playground):');

  await runStep('POST /api/playground executes BTC prompt, selects AlphaMarket & signs EIP-712', async () => {
    const res = await fetch(`${BASE_URL}/api/playground`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Analyze institutional BTC order flow and ETF prints',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.agent && data.agent.walletAddress, 'Expected agent wallet address');
    assert(data.execution.intentDetected === 'FINANCIAL_ALPHA_TELEMETRY', 'Expected intent match');
    assert(data.execution.serviceCalled.id === 'm2m_alpha_intel', 'Expected AlphaMarket service');
    assert(data.execution.voucher.signature.startsWith('0x'), 'Expected EIP-712 signature');
    assert(data.execution.voucher.authHeader.startsWith('APay eip712:'), 'Expected APay authHeader');
    assert(data.execution.settlement.status === 'SETTLED_ON_CHAIN', 'Expected settlement status');
    assert(data.response.text.includes('BTC Order Flow Analysis'), 'Expected synthesized text');
  });

  await runStep('POST /api/playground executes contract audit prompt and selects CodeAudit', async () => {
    const res = await fetch(`${BASE_URL}/api/playground`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Audit smart contract 0xd08c8a337e5339d1c083e06d74a9265956ceea16 for vulnerabilities',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.execution.intentDetected === 'SMART_CONTRACT_SECURITY_AUDIT', 'Expected audit intent');
    assert(data.execution.serviceCalled.id === 'm2m_code_audit', 'Expected CodeAudit service');
    assert(data.response.text.includes('Security Audit Report'), 'Expected audit report in response');
  });

  await runStep('POST /api/playground rejects empty or invalid prompt with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/playground`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '   ',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error, 'Expected error message');
  });

  // =====================================================================
  // 12. UNCLAIMED DOMAIN ESCROW & REVENUE CLAIM TEST SUITE
  // =====================================================================

  const testClaimDomain = `https://e2e-publisher-claim-${Date.now()}.ai/api`;
  const testClaimWallet = '0x1a927F4316e52FfD29A26C37Fc378DF044bebF9d';

  await runStep('POST /api/domain-claim/lookup initializes and retrieves accrued domain escrow', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: testClaimDomain,
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.status === 'unclaimed', 'Expected initial status: unclaimed');
    assert(parseFloat(data.accruedApay) > 0, 'Expected positive accrued $APAY');
    assert(parseFloat(data.accruedUsdc) > 0, 'Expected positive accrued USDC');
    assert(data.totalRequestsBlocked > 0, 'Expected positive bot blocks');
    assert(data.verificationToken.startsWith('apay-claim-'), 'Expected apay-claim- token');
    assert(data.dnsChallenge.recordType === 'TXT', 'Expected DNS TXT record challenge');
    assert(data.dnsChallenge.name.includes('_apay-challenge'), 'Expected challenge hostname');
    assert(data.httpChallenge.path === '/.well-known/apay-claim.txt', 'Expected well-known path');
  });

  await runStep('POST /api/domain-claim/lookup rejects demo or placeholder domain with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'yourdomain.com',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('Placeholder or demo domains'), 'Expected placeholder rejection');
  });

  await runStep('POST /api/domain-claim/lookup rejects missing domain with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network: 'base-sepolia' }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
  });

  await runStep('POST /api/domain-claim/verify rejects invalid recipient wallet with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: testClaimDomain,
        walletAddress: 'invalid-wallet-address',
        method: 'dns',
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('Invalid or missing EVM recipient wallet address'), 'Expected wallet error');
  });

  await runStep('POST /api/domain-claim/verify verifies ownership and dispenses accrued tokens', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-APay-Test': 'true',
      },
      body: JSON.stringify({
        domain: testClaimDomain,
        walletAddress: testClaimWallet,
        method: 'dns',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.verified === true, 'Expected verified: true');
    assert(data.recipient.toLowerCase() === testClaimWallet.toLowerCase(), 'Expected recipient match');
    assert(parseFloat(data.amountApay) > 0, 'Expected dispensed $APAY');
    assert(data.txHash.startsWith('0x'), 'Expected EVM txHash');
    assert(data.explorerUrl.includes('basescan.org'), 'Expected basescan link');
  });

  await runStep('POST /api/domain-claim/verify prevents double claims on already claimed domains with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-APay-Test': 'true',
      },
      body: JSON.stringify({
        domain: testClaimDomain,
        walletAddress: testClaimWallet,
        method: 'dns',
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('already verified and claimed'), 'Expected double-claim rejection');
  });

  await runStep('POST /api/domain-claim/lookup on claimed domain returns status: claimed', async () => {
    const res = await fetch(`${BASE_URL}/api/domain-claim/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: testClaimDomain,
        network: 'base-sepolia',
      }),
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === 'claimed', 'Expected status: claimed');
    assert(data.claimedBy.toLowerCase() === testClaimWallet.toLowerCase(), 'Expected claimedBy match');
  });

  // =====================================================================
  // RESULTS SUMMARY
  // =====================================================================

  console.log('\n========================================================================');
  console.log('📊 WEB E2E TEST RESULTS:');
  console.log(`   • Total Passed : ${testsPassed}`);
  console.log(`   • Total Failed : ${testsFailed}`);
  console.log('========================================================================');

  if (testsFailed > 0) {
    console.error(`❌ ${testsFailed} Web E2E test(s) failed!`);
    process.exit(1);
  } else {
    console.log('✅ ALL WEB APIS & ASSETS 100% OPERATIONAL WITH ZERO DEFECTS!');
  }
}

main()
  .catch((err) => {
    console.error('\n🚨 Unexpected Test Suite Error:', err);
    testsFailed++;
  })
  .finally(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      // Ensure child process is killed
      setTimeout(() => {
        try {
          serverProcess.kill('SIGKILL');
        } catch {}
      }, 500);
    }
    process.exit(testsFailed > 0 ? 1 : 0);
  });
