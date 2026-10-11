import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentWalletTS } from '../dist/client.js';
import { createAPayAITool, createAPayToolkit } from '../dist/integrations/ai-sdk.js';

test('createAPayAITool generates valid tool definition and handles HTTP 402', async () => {
  const wallet = AgentWalletTS.create({
    maxPerCallUsdc: 0.05,
    dailyBudgetUsdc: 1.0,
  });

  let calls = 0;
  let sentAuthHeader = null;

  const mockFetch = async (input, init) => {
    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: 'Payment Required' }), {
        status: 402,
        headers: {
          'X-APay-Receiver': '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
          'X-APay-Nonce': 'sdk-test-nonce-101',
          'X-APay-Currency': 'USDC',
          'X-APay-Amount-USDC': '5000',
          'X-APay-Router': '0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6',
          'X-APay-Chain-Id': '84532',
        },
      });
    }

    const headers = new Headers(init?.headers);
    sentAuthHeader = headers.get('Authorization');
    return new Response(JSON.stringify({ result: 'Alpha verified' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const tool = createAPayAITool({
      description: 'Fetch alpha intelligence',
      targetUrl: 'https://api.test/alpha',
      wallet,
    });

    assert.equal(tool.description, 'Fetch alpha intelligence');
    assert.equal(tool.targetUrl, 'https://api.test/alpha');
    assert.equal(tool.method, 'GET');

    const result = await tool.execute({ query: 'crypto-trends' });
    assert.deepEqual(result, { result: 'Alpha verified' });
    assert.equal(calls, 2);
    assert.ok(sentAuthHeader.startsWith('APay eip712:0x'));

    const status = tool.getWalletStatus();
    assert.equal(status.address, wallet.address);
    assert.equal(status.spentUsdc, 0.005);
    assert.equal(status.remainingUsdc, 0.995);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('createAPayToolkit generates map of tools', async () => {
  const wallet = AgentWalletTS.create();
  const toolkit = createAPayToolkit(wallet, {
    feedA: { url: 'https://a.test', description: 'Feed A' },
    feedB: { url: 'https://b.test', description: 'Feed B', method: 'POST' },
  });

  assert.ok(toolkit.feedA);
  assert.ok(toolkit.feedB);
  assert.equal(toolkit.feedA.method, 'GET');
  assert.equal(toolkit.feedB.method, 'POST');
});
