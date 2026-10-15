import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentWalletTS } from '../dist/client.js';
import { APayActionProvider, createAPayActionProvider } from '../dist/integrations/agentkit.js';

test('APayActionProvider initializes with default config and provides all 5 actions', () => {
  const provider = createAPayActionProvider();
  assert.equal(provider.name, 'apay_action_provider');
  assert.equal(provider.network, 'base-mainnet');
  assert.ok(provider.wallet.address.startsWith('0x'));

  const actions = provider.getActions();
  assert.equal(actions.length, 5);
  const actionNames = actions.map((a) => a.name);
  assert.ok(actionNames.includes('apay_probe_endpoint'));
  assert.ok(actionNames.includes('apay_request'));
  assert.ok(actionNames.includes('apay_get_wallet_status'));
  assert.ok(actionNames.includes('apay_get_balance'));
  assert.ok(actionNames.includes('apay_set_budget'));
});

test('APayActionProvider supportsNetwork verifies Base L2', () => {
  const provider = createAPayActionProvider();
  assert.equal(provider.supportsNetwork({ chainId: 8453 }), true);
  assert.equal(provider.supportsNetwork({ chainId: 84532 }), true);
  assert.equal(provider.supportsNetwork({ networkId: 'base-mainnet' }), true);
  assert.equal(provider.supportsNetwork({ networkId: 'base-sepolia' }), true);
});

test('APayActionProvider probeEndpoint handles HTTP 402 challenges', async () => {
  const provider = createAPayActionProvider();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Payment Required' }), {
      status: 402,
      headers: {
        'x-apay-amount': '0.005',
        'x-apay-currency': 'USDC',
        'x-apay-receiver': '0xd08c8a337e5339d1c083e06d74a9265956ceea16',
      },
    });

  try {
    const raw = await provider.probeEndpoint({ url: 'https://api.test/intel' });
    const data = JSON.parse(raw);
    assert.equal(data.url, 'https://api.test/intel');
    assert.equal(data.requiresPayment, true);
    assert.equal(data.price, '0.005');
    assert.equal(data.currency, 'USDC');
    assert.equal(data.receiver, '0xd08c8a337e5339d1c083e06d74a9265956ceea16');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('APayActionProvider getWalletStatus returns limits and spend', async () => {
  const wallet = AgentWalletTS.create({
    maxPerCallUsdc: 0.12,
    dailyBudgetUsdc: 4.5,
  });
  const provider = createAPayActionProvider({ wallet });

  const raw = await provider.getWalletStatus();
  const data = JSON.parse(raw);
  assert.equal(data.address, wallet.address);
  assert.equal(data.spendingGuardrails.maxPerCallUsdc, 0.12);
  assert.equal(data.spendingGuardrails.dailyBudgetUsdc, 4.5);
  assert.equal(data.spendingGuardrails.totalSpentUsdc, 0);
});

test('APayActionProvider setBudget updates active limits', async () => {
  const provider = createAPayActionProvider();

  const raw = await provider.setBudget({
    maxPerCallUsdc: 0.25,
    dailyBudgetUsdc: 10.0,
    maxPerCallApay: 50.0,
    dailyBudgetApay: 500.0,
  });
  const data = JSON.parse(raw);
  assert.equal(data.status, 'updated');
  assert.equal(provider.wallet.maxPerCallUsdc, 0.25);
  assert.equal(provider.wallet.dailyBudgetUsdc, 10.0);
  assert.equal(provider.wallet.maxPerCallApay, 50.0);
  assert.equal(provider.wallet.dailyBudgetApay, 500.0);
});

test('APayActionProvider getBalance queries Base RPC', async () => {
  const provider = createAPayActionProvider();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: '0x14d1120d7b160000', // 1.5 ETH in hex
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    const raw = await provider.getBalance({
      address: '0xd08c8a337e5339d1c083e06d74a9265956ceea16',
    });
    const data = JSON.parse(raw);
    assert.equal(data.address, '0xd08c8a337e5339d1c083e06d74a9265956ceea16');
    assert.equal(data.balances.ETH, '1.500000');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
