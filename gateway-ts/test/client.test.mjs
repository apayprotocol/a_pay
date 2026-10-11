import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentWalletTS, APayClientTS, fetchWithAPay, discoverServices } from '../dist/client.js';

test('AgentWalletTS generates valid non-custodial address and enforces guardrails', () => {
  const wallet = AgentWalletTS.create({
    maxPerCallUsdc: 0.01,
    dailyBudgetUsdc: 0.05,
    maxPerCallApay: 5.0,
    dailyBudgetApay: 50.0,
  });

  assert.ok(wallet.address.startsWith('0x'));
  assert.equal(wallet.address.length, 42);

  // Spend allowed within limits
  const okUsdc = wallet.canSpend(0.005, 'USDC');
  assert.equal(okUsdc.allowed, true);

  // Spend rejected when exceeding maxPerCallUsdc
  const overUsdc = wallet.canSpend(0.02, 'USDC');
  assert.equal(overUsdc.allowed, false);
  assert.match(overUsdc.reason, /exceeds max per call limit/);

  // APAY token spend allowed
  const okApay = wallet.canSpend(2.0, 'APAY');
  assert.equal(okApay.allowed, true);

  // APAY token spend rejected when exceeding limit
  const overApay = wallet.canSpend(10.0, 'APAY');
  assert.equal(overApay.allowed, false);
  assert.match(overApay.reason, /exceeds max per call limit/);
});

test('AgentWalletTS signs authentic EIP-712 PaymentAuthorization digest', async () => {
  const wallet = AgentWalletTS.create();
  const sig = await wallet.signPaymentAuthorization({
    receiver: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    amountBaseUnits: 1000n,
    nonce: 'test-nonce-12345',
    chainId: 84532,
    verifyingContract: '0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6',
  });

  assert.ok(sig.startsWith('0x'));
  assert.equal(sig.length, 132); // 65 bytes in hex + 0x prefix = 132 chars
});

test('APayClientTS auto-negotiates HTTP 402 challenge and unlocks resource', async () => {
  const wallet = AgentWalletTS.create({
    maxPerCallUsdc: 0.01,
  });

  let calls = 0;
  let receivedAuthHeader = null;

  // Mock fetch handler
  const mockFetch = async (input, init) => {
    calls++;
    if (calls === 1) {
      // First call: challenge with HTTP 402
      return new Response(JSON.stringify({ error: 'Payment Required' }), {
        status: 402,
        headers: {
          'X-APay-Receiver': '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
          'X-APay-Nonce': 'mock-challenge-nonce-999',
          'X-APay-Currency': 'DUAL',
          'X-APay-Amount-USDC': '1000',
          'X-APay-Amount-APAY': '4000000000000000000',
          'X-APay-Router': '0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6',
          'X-APay-Chain-Id': '84532',
        },
      });
    }

    // Second call: verify payment authorization header was sent
    const headers = new Headers(init?.headers);
    receivedAuthHeader = headers.get('Authorization');
    return new Response(JSON.stringify({ secret: 'ALPHA_INTELLIGENCE_DATA' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new APayClientTS(wallet);
    const response = await client.fetch('https://api.market.com/alpha');

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.secret, 'ALPHA_INTELLIGENCE_DATA');

    // Verify 2 roundtrips occurred (402 -> sign -> 200)
    assert.equal(calls, 2);

    // Verify Authorization header format
    assert.ok(receivedAuthHeader.startsWith('APay eip712:0x'));
    assert.ok(receivedAuthHeader.includes(wallet.address));
    assert.ok(receivedAuthHeader.includes('mock-challenge-nonce-999'));
    assert.ok(receivedAuthHeader.endsWith(':1000'));

    // Verify spend was recorded in wallet ledger
    assert.equal(wallet.totalSpentUsdc, 0.001);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('APayClientTS rejects overcharging when price exceeds client guardrails', async () => {
  const wallet = AgentWalletTS.create({
    maxPerCallUsdc: 0.0005, // Lower than the 0.001 asked by server
  });

  const mockFetch = async () => {
    return new Response(JSON.stringify({ error: 'Payment Required' }), {
      status: 402,
      headers: {
        'X-APay-Receiver': '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
        'X-APay-Nonce': 'mock-overcharge-nonce',
        'X-APay-Currency': 'USDC',
        'X-APay-Amount': '1000', // $0.001 USDC
      },
    });
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new APayClientTS(wallet);
    await assert.rejects(
      async () => {
        await client.fetch('https://api.expensive.com/data');
      },
      /\[A-Pay Guardrail Triggered\]/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discoverServices queries public registry endpoint and returns service array', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.ok(url.includes('?public=true'));
    return new Response(
      JSON.stringify({
        success: true,
        count: 1,
        services: [
          {
            targetDomain: 'https://api.alpha.network',
            price: '0.001 USDC',
            network: 'base',
            version: '0.1.8',
            status: 'online',
            lastHeartbeat: 1789921800,
          },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const services = await discoverServices('https://mock-registry.com/api/registry');
    assert.equal(services.length, 1);
    assert.equal(services[0].targetDomain, 'https://api.alpha.network');
    assert.equal(services[0].price, '0.001 USDC');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

