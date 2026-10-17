import express from 'express';
import dotenv from 'dotenv';
import { apayMiddleware } from 'apay-gateway';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const RECEIVER = process.env.APAY_RECEIVER_WALLET || '0xd08c8a337e5339d1c083e06d74a9265956ceea16';
const PRICE = parseFloat(process.env.APAY_PRICE_USDC || '0.002');
const NETWORK = process.env.APAY_NETWORK || 'base-mainnet';

app.use(express.json());
app.use(express.static('public'));

// 1-Line Drop-in HTTP 402 Paywall Middleware
const paywall = apayMiddleware({
  receiver: RECEIVER,
  priceUsdc: PRICE,
  network: NETWORK,
  currency: 'DUAL', // Accepts both USDC and $APAY token
  targetDomain: process.env.APAY_PUBLIC_DOMAIN, // Auto-registers in Global Registry when deployed
});

// Monetized AI Agent Endpoint
app.get('/api/agent', paywall, (req, res) => {
  const query = req.query.q || 'default query';
  const payer = req.headers['x-apay-payer'] || 'Anonymous Payer';
  
  res.json({
    status: 'success',
    query,
    result: `Proprietary AI response for query: "${query}"`,
    paid_by: payer,
    settled: true,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 A-Pay Monetized Express Server running on http://localhost:${PORT}`);
  console.log(`💳 Payout Wallet: ${RECEIVER} | Price: $${PRICE} USDC`);
});
