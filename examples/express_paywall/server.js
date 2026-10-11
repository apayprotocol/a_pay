/**
 * Example: 1-Line HTTP 402 Paywall with Express.js & A-Pay
 * Demonstrates how to monetize any Node.js / Express route in 1 line.
 *
 * Run:
 *   node examples/express_paywall/server.js
 */

import express from 'express';
import { apayExpress } from '../../gateway-ts/src/middleware.js';

const app = express();
const port = 3000;

// 1. Free public endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome. Visit /v1/intel for paid proprietary market data protected by A-Pay.',
  });
});

// 2. Protected endpoint with 1-line A-Pay middleware ($0.001 USDC per call)
app.use(
  '/v1/intel',
  apayExpress({
    receiverAddress: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
    priceUsdc: 0.001,
    network: 'base',
  })
);

app.get('/v1/intel', (req, res) => {
  res.json({
    status: 'success',
    secret_data: 'CONFIDENTIAL: High-frequency orderbook imbalance favors BTC long positions.',
    payer: req.apayClaim?.payer,
    settled: true,
  });
});

app.listen(port, () => {
  console.log(`⚡ Paywalled Express API running at http://localhost:${port}`);
});
