#!/usr/bin/env node

/**
 * create-apay-app CLI
 *
 * Initialize a monetized AI Agent API or Paywall app with A-Pay in 60 seconds.
 * Supports Next.js, FastAPI, and Express on Base Layer 2.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BANNER = `
\x1b[36m   ___          ____\x1b[0m             
\x1b[36m  / _ |  ____  / __ \\___ ___ __\x1b[0m 
\x1b[34m / __ | /___/ / /_/ / _ \`/ // /\x1b[0m 
\x1b[35m/_/ |_|      / .___/\\_,_/\\_, /\x1b[0m  
\x1b[35m            /_/         /___/\x1b[0m   
\x1b[1m\x1b[32m⚡ A-PAY PROTOCOL: 1-Click Monetized Agent App Generator\x1b[0m
\x1b[90mBase Layer 2 • HTTP 402 • EIP-712 • Dual-Currency (USDC & $APAY)\x1b[0m
`;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function prompt(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} \x1b[90m(${defaultValue})\x1b[0m: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log(BANNER);

  const args = process.argv.slice(2);
  let projectName = args[0] && !args[0].startsWith('--') ? args[0] : null;
  
  let template = 'nextjs';
  let receiver = '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc';
  let network = 'base-mainnet';
  let autoYes = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && args[i + 1]) template = args[i + 1].toLowerCase();
    if (args[i] === '--receiver' && args[i + 1]) receiver = args[i + 1];
    if (args[i] === '--network' && args[i + 1]) network = args[i + 1];
    if (args[i] === '--yes' || args[i] === '-y') autoYes = true;
  }

  if (!autoYes && !projectName) {
    projectName = await prompt('Project name', 'my-apay-agent');
    const templateChoice = await prompt('Framework (1: Next.js 15, 2: FastAPI, 3: Express)', '1');
    if (templateChoice === '2' || templateChoice.toLowerCase() === 'fastapi') template = 'fastapi';
    else if (templateChoice === '3' || templateChoice.toLowerCase() === 'express') template = 'express';
    else template = 'nextjs';

    receiver = await prompt('Payout Receiver Wallet (EVM address)', receiver);
    network = await prompt('Target Network (base-mainnet / base-sepolia)', network);
  }

  if (!projectName) projectName = 'my-apay-agent';
  if (!['nextjs', 'fastapi', 'express'].includes(template)) {
    console.error(`\x1b[31mError: Unknown template "${template}". Choose "nextjs", "fastapi", or "express".\x1b[0m`);
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    console.error(`\x1b[31mError: Directory "${projectName}" already exists.\x1b[0m`);
    process.exit(1);
  }

  const templateDir = path.resolve(__dirname, '../templates', template);
  if (!fs.existsSync(templateDir)) {
    console.error(`\x1b[31mError: Template source not found at ${templateDir}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\n📦 Scaffolding A-Pay \x1b[36m${template.toUpperCase()}\x1b[0m app into \x1b[32m${targetDir}\x1b[0m...`);
  copyDir(templateDir, targetDir);

  // Generate .env
  const envContent = `PORT=3000
APAY_RECEIVER_WALLET=${receiver}
APAY_PRICE_USDC=0.002
APAY_NETWORK=${network}
`;
  fs.writeFileSync(path.join(targetDir, '.env'), envContent);
  if (template === 'nextjs') {
    fs.writeFileSync(path.join(targetDir, '.env.local'), envContent);
  }

  // Update name in package.json or pyproject.toml
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.name = projectName;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    } catch (_) {}
  }

  const pyprojectPath = path.join(targetDir, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    let pyContent = fs.readFileSync(pyprojectPath, 'utf8');
    pyContent = pyContent.replace(/name = ".*"/, `name = "${projectName}"`);
    fs.writeFileSync(pyprojectPath, pyContent);
  }

  console.log(`\x1b[32m✔ Project successfully created!\x1b[0m\n`);
  console.log(`\x1b[1mNext Steps:\x1b[0m`);
  console.log(`  cd \x1b[36m${projectName}\x1b[0m`);

  if (template === 'fastapi') {
    console.log(`  \x1b[33muv sync\x1b[0m  (or pip install -e .)`);
    console.log(`  \x1b[33muv run uvicorn main:app --reload --port 8000\x1b[0m`);
    console.log(`\n📡 Paid Endpoint: http://localhost:8000/api/agent`);
  } else if (template === 'express') {
    console.log(`  \x1b[33mnpm install\x1b[0m`);
    console.log(`  \x1b[33mnpm run dev\x1b[0m`);
    console.log(`\n📡 App UI & Paywall: http://localhost:3000`);
  } else {
    console.log(`  \x1b[33mnpm install\x1b[0m`);
    console.log(`  \x1b[33mnpm run dev\x1b[0m`);
    console.log(`\n📡 App UI & Paywall: http://localhost:3000`);
  }

  console.log(`\n💳 Payouts routed to: \x1b[32m${receiver}\x1b[0m on \x1b[35m${network}\x1b[0m`);
  console.log(`🔥 Ready for AI agent autonomous micropayments & instant settlement!\n`);
}

main().catch((err) => {
  console.error('\x1b[31mUnexpected error:\x1b[0m', err);
  process.exit(1);
});
