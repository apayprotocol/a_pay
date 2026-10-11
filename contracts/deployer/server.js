import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncAddresses } from '../scripts/sync-addresses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3333;
const artifactsDir = path.resolve(__dirname, '../artifacts');
const deployedPath = path.resolve(__dirname, '../deployed-addresses.json');

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading deployer page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url.startsWith('/artifacts/')) {
    const artifactName = path.basename(req.url);
    const artifactPath = path.join(artifactsDir, artifactName);
    if (fs.existsSync(artifactPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(artifactPath));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Artifact ${artifactName} not found` }));
    }
  } else if (req.url === '/api/status' && req.method === 'GET') {
    if (fs.existsSync(deployedPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(deployedPath));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ contracts: {} }));
    }
  } else if (req.url === '/api/save-deployment' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const updated = syncAddresses({
          APAYToken: payload.APAYToken,
          APayRouter: payload.APayRouter,
          APayRouterV2: payload.APayRouterV2,
          EscrowVault: payload.EscrowVault,
          StakingVault: payload.StakingVault,
          founderAddress: payload.founderAddress,
          network: 'baseSepolia',
          chainId: 84532,
        });
        console.log(`✅ [Deployer API] Synced addresses to ${updated.length} files:`, updated);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, updatedFiles: updated }));
      } catch (err) {
        console.error('❌ [Deployer API] Failed to save deployment:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`==================================================`);
  console.log(`🚀 A-Pay 1-Click Browser Deployer Running!`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Target: Base Sepolia (Chain ID: 84532)`);
  console.log(`==================================================`);
});
