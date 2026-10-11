import test from 'node:test';
import assert from 'node:assert/strict';
import { APayGateway, SlidingWindowNonceCache } from '../dist/index.js';

test('SlidingWindowNonceCache prevents replay attacks', () => {
  const cache = new SlidingWindowNonceCache(60, 1000);
  const nonce = 'test-nonce-12345';

  assert.equal(cache.consume(nonce), true, 'First consumption must succeed');
  assert.equal(cache.consume(nonce), false, 'Immediate replay must be rejected');
});

test('APayGateway generates standard HTTP 402 challenge on missing auth header', async () => {
  const gateway = new APayGateway({
    receiverAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    priceUsdc: 0.002,
    network: 'base',
    chainId: 84532,
  });

  const result = await gateway.verifyRequest(null);
  assert.equal(result.authorized, false);
  assert.ok(result.challenge);
  assert.equal(result.challenge['X-APay-Receiver'], '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc');
  assert.equal(result.challenge['X-APay-Amount'], '2000'); // 0.002 * 10^6
  assert.equal(result.challenge['X-APay-Currency'], 'USDC');
  assert.equal(result.challenge['X-APay-Scheme'], 'eip712');
  assert.ok(result.challenge['X-APay-Nonce']);
});

test('APayGateway rejects malformed authorization headers', async () => {
  const gateway = new APayGateway({
    receiverAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    priceUsdc: 0.001,
  });

  const res1 = await gateway.verifyRequest('Bearer invalid-token');
  assert.equal(res1.authorized, false);
  assert.ok(res1.challenge, 'Non-APay scheme should trigger 402 challenge');

  const res2 = await gateway.verifyRequest('APay eip712:invalid');
  assert.equal(res2.authorized, false);
  assert.equal(res2.error, 'Malformed authorization header');
});

test('APayGateway rejects underpayment attempts (amount < priceBaseUnits)', async () => {
  const gateway = new APayGateway({
    receiverAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    priceUsdc: 0.002, // 2000 base units
  });

  // Payer attempts to pay 100 base units ($0.0001) instead of 2000
  const underpaidHeader = 'APay eip712:0xmockSig:0x90b2aC9C6eb22686205eB2962f62392D67e375A0:test-nonce-underpay:100';
  const result = await gateway.verifyRequest(underpaidHeader);

  assert.equal(result.authorized, false);
  assert.ok(result.error?.includes('Underpayment: Signed amount 100 is less than required price'));
});

test('APayGateway generates DUAL currency challenge headers (USDC + APAY)', async () => {
  const gateway = new APayGateway({
    receiverAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    currency: 'DUAL',
    priceUsdc: 0.001,
    priceApay: 4.0,
  });

  const result = await gateway.verifyRequest(null);
  assert.equal(result.authorized, false);
  assert.ok(result.challenge);
  assert.equal(result.challenge['X-APay-Currency'], 'DUAL');
  assert.equal(result.challenge['X-APay-Amount-USDC'], '1000');
  assert.equal(result.challenge['X-APay-Amount-APAY'], '4000000000000000000'); // 4.0 * 10^18
  assert.equal(result.challenge['X-APay-Token-USDC'], '0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  assert.equal(result.challenge['X-APay-Token-APAY'], '0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3');
});
