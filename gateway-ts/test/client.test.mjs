import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentWalletTS, APayClientTS, fetchWithAPay, discoverServices, checkSellerSeal } from '../dist/client.js';

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

test('checkSellerSeal correctly inspects SealKeeper API for wallet.proven', async () => {
  const originalFetch = globalThis.fetch;

  // Case 1: Proven seller
  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('seal/verify')) {
      return new Response(
        JSON.stringify({
          valid: true,
          payload: {
            subject: { kind: 'service', interfaces: ['x402'] },
            evidence: [{ type: 'x402_check', wallet: { proven: true, changes_30d: 0 } }],
          },
        }),
        { status: 200 }
      );
    }
    assert.ok(urlStr.includes('api.sealkeeper.run/v1/services/seal'));
    return new Response(
      JSON.stringify({
        services: [
          {
            handle: 'alpha-api',
            seal: 'valid-seal-token',
          },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const res = await checkSellerSeal('0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc');
    assert.equal(res.verified, true);
    assert.equal(res.proven, true);
    assert.equal(res.handle, 'alpha-api');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Case 2: Unproven seller
  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes('seal/verify')) {
      return new Response(
        JSON.stringify({
          valid: true,
          payload: {
            subject: { kind: 'service', interfaces: ['x402'] },
            evidence: [{ type: 'x402_check', wallet: { proven: false } }],
          },
        }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        services: [
          {
            handle: 'unproven-api',
            seal: 'unproven-seal-token',
          },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const res = await checkSellerSeal('0x1111111111111111111111111111111111111111');
    assert.equal(res.verified, true);
    assert.equal(res.proven, false);
    assert.match(res.reason, /wallet\.proven is false/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('APayClientTS with verifySellerSeal blocks payment when seller is unproven', async () => {
  const wallet = AgentWalletTS.create({ maxPerCallUsdc: 0.05 });

  const mockFetch = async (input) => {
    const urlStr = input.toString();
    if (urlStr.includes('seal/verify')) {
      return new Response(
        JSON.stringify({
          valid: true,
          payload: {
            subject: { kind: 'service', interfaces: ['x402'] },
            evidence: [{ type: 'x402_check', wallet: { proven: false } }],
          },
        }),
        { status: 200 }
      );
    }
    if (urlStr.includes('api.sealkeeper.run')) {
      return new Response(
        JSON.stringify({
          services: [
            {
              handle: 'unproven-api',
              seal: 'unproven-seal-token',
            },
          ],
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: 'Payment Required' }), {
      status: 402,
      headers: {
        'X-APay-Receiver': '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
        'X-APay-Nonce': 'mock-seal-nonce',
        'X-APay-Currency': 'USDC',
        'X-APay-Amount': '1000',
        'X-APay-Chain-Id': '8453',
      },
    });
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new APayClientTS(wallet, { verifySellerSeal: true });
    await assert.rejects(
      async () => {
        await client.fetch('https://api.suspect.com/data');
      },
      /\[A-Pay SealKeeper Guardrail\] Payment blocked: seller wallet.*is not proven on SealKeeper/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('APayClientTS with verifySellerSeal allows payment when seller is proven on SealKeeper', async () => {
  const wallet = AgentWalletTS.create({ maxPerCallUsdc: 0.05 });

  let calls = 0;
  const mockFetch = async (input) => {
    const urlStr = input.toString();
    if (urlStr.includes('seal/verify')) {
      return new Response(
        JSON.stringify({
          valid: true,
          payload: {
            subject: { kind: 'service', interfaces: ['x402'] },
            evidence: [{ type: 'x402_check', wallet: { proven: true, changes_30d: 0 } }],
          },
        }),
        { status: 200 }
      );
    }
    if (urlStr.includes('api.sealkeeper.run')) {
      return new Response(
        JSON.stringify({
          services: [
            {
              handle: 'verified-api',
              seal: 'verified-seal-token',
            },
          ],
        }),
        { status: 200 }
      );
    }

    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: 'Payment Required' }), {
        status: 402,
        headers: {
          'X-APay-Receiver': '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
          'X-APay-Nonce': 'mock-proven-nonce',
          'X-APay-Currency': 'USDC',
          'X-APay-Amount': '1000',
          'X-APay-Chain-Id': '8453',
        },
      });
    }

    return new Response(JSON.stringify({ data: 'SECURE_DATA_RECEIVED' }), {
      status: 200,
    });
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const client = new APayClientTS(wallet, { verifySellerSeal: true });
    const res = await client.fetch('https://api.verified.com/data');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data, 'SECURE_DATA_RECEIVED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

