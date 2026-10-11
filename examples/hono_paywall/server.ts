/**
 * A-Pay Hono & Edge Paywall Example
 * Demonstrates 1-line micropayment monetization for Hono, Cloudflare Workers, and Bun.
 */
import { Hono } from 'hono';
import { apayHono } from '../../gateway-ts/src/middleware.js';

const app = new Hono();

// Protect all /v1/intel endpoints with A-Pay HTTP 402 Paywall
app.use(
  '/v1/intel/*',
  apayHono({
    receiverAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    priceUsdc: 0.001,
    network: 'base',
  })
);

app.get('/v1/intel/alpha-stream', (c) => {
  const claim = c.get('apayClaim');
  return c.json({
    status: 'success',
    report: 'CONFIDENTIAL MACRO ALPHA: Fed Balance Sheet expansion detected',
    paid_by: claim?.payer || 'anonymous_agent',
    settled_on: 'Base L2 (EIP-712 Verified)',
  });
});

export default app;
