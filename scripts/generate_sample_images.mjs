import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('../web/node_modules/sharp');

const OUTPUT_DIR = path.resolve(__dirname, 'assets/sample_previews');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const PALETTES = [
  {
    id: 'palette_1_stripe_base',
    name: 'Stripe & Base Electric (Fintech Blue)',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#0052FF',
    primaryLight: '#EFF6FF',
    textDark: '#0F172A',
    textMuted: '#64748B',
    redBg: '#FEF2F2',
    redBorder: '#FECACA',
    redText: '#DC2626',
    greenBg: '#ECFDF5',
    greenBorder: '#A7F3D0',
    greenText: '#059669',
    badgeText: '#1D4ED8',
  },
  {
    id: 'palette_2_linear_slate',
    name: 'Linear & Notion Tech (Electric Violet + Coral)',
    bg: '#F9FAFB',
    cardBg: '#FFFFFF',
    border: '#E5E7EB',
    primary: '#6366F1',
    primaryLight: '#EEF2FF',
    textDark: '#111827',
    textMuted: '#6B7280',
    redBg: '#FFF1F2',
    redBorder: '#FECDD3',
    redText: '#E11D48',
    greenBg: '#ECFDF5',
    greenBorder: '#A7F3D0',
    greenText: '#059669',
    badgeText: '#4338CA',
  },
  {
    id: 'palette_3_openai_emerald',
    name: 'OpenAI & Apple Studio (Crisp Slate + Emerald)',
    bg: '#F7F7F8',
    cardBg: '#FFFFFF',
    border: '#E3E3E8',
    primary: '#10A37F',
    primaryLight: '#ECFDF5',
    textDark: '#18181B',
    textMuted: '#71717A',
    redBg: '#FEF2F2',
    redBorder: '#FCA5A5',
    redText: '#DC2626',
    greenBg: '#F0FDF4',
    greenBorder: '#BBF7D0',
    greenText: '#16A34A',
    badgeText: '#047857',
  },
  {
    id: 'palette_4_modern_amber_blue',
    name: 'Modern SaaS (Cyber Sky + Amber Accent)',
    bg: '#FAFAF9',
    cardBg: '#FFFFFF',
    border: '#E7E5E4',
    primary: '#0284C7',
    primaryLight: '#F0F9FF',
    textDark: '#1C1917',
    textMuted: '#78716C',
    redBg: '#FFF7ED',
    redBorder: '#FED7AA',
    redText: '#C2410C',
    greenBg: '#ECFDF5',
    greenBorder: '#A7F3D0',
    greenText: '#059669',
    badgeText: '#0369A1',
  }
];

function buildSVG(p) {
  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft Drop Shadow for Floating Card -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#000000" flood-opacity="0.04" />
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.02" />
    </filter>
  </defs>

  <!-- Clean Light Canvas -->
  <rect width="1080" height="1080" fill="${p.bg}" />

  <!-- Main Floating Card -->
  <rect x="50" y="50" width="980" height="980" rx="36" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2" filter="url(#cardShadow)" />

  <!-- Top Brand & Category Badges -->
  <rect x="95" y="95" width="220" height="44" rx="22" fill="${p.primaryLight}" />
  <text x="115" y="123" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="700" fill="${p.primary}" letter-spacing="1">⚡ A-PAY PROTOCOL</text>

  <rect x="735" y="95" width="250" height="44" rx="22" fill="#F1F5F9" />
  <text x="755" y="123" font-family="Inter, -apple-system, sans-serif" font-size="15" font-weight="600" fill="${p.textMuted}" letter-spacing="0.5">2026 PUBLISHER AUDIT</text>

  <!-- Big Bold Question Hook -->
  <text x="95" y="210" font-family="Inter, -apple-system, sans-serif" font-size="50" font-weight="800" fill="${p.textDark}" letter-spacing="-1.5">
    Why are 98% of your readers
  </text>
  <text x="95" y="272" font-family="Inter, -apple-system, sans-serif" font-size="50" font-weight="800" fill="${p.primary}" letter-spacing="-1.5">
    bouncing without paying you?
  </text>

  <!-- Subtitle -->
  <text x="95" y="325" font-family="Inter, -apple-system, sans-serif" font-size="24" font-weight="500" fill="${p.textMuted}">
    Traditional monetization is mathematically broken for digital articles:
  </text>

  <!-- Comparison Grid -->
  <!-- Left Box: The Bleed / Traditional Web2 -->
  <rect x="95" y="370" width="430" height="340" rx="24" fill="${p.redBg}" stroke="${p.redBorder}" stroke-width="1.5" />
  <text x="125" y="415" font-family="Inter, -apple-system, sans-serif" font-size="24" font-weight="800" fill="${p.redText}" letter-spacing="-0.5">
    ❌ TRADITIONAL WEB2
  </text>
  
  <text x="125" y="465" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="500" fill="#991B1B">
    • AdSense RPM collapsed to $1.50
  </text>
  <text x="125" y="515" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="500" fill="#991B1B">
    • 42% readers use ad-blockers ($0)
  </text>
  <text x="125" y="565" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="500" fill="#991B1B">
    • Stripe takes $0.30 fee on $0.50 post
  </text>
  <text x="125" y="615" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="500" fill="#991B1B">
    • AI bots scrape bandwidth for free
  </text>
  <text x="125" y="665" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="500" fill="#991B1B">
    • 7-day payment holds &amp; card fraud
  </text>

  <!-- Right Box: The 10X Solution / A-Pay Paywall -->
  <rect x="555" y="370" width="430" height="340" rx="24" fill="${p.greenBg}" stroke="${p.greenBorder}" stroke-width="1.5" />
  <text x="585" y="415" font-family="Inter, -apple-system, sans-serif" font-size="24" font-weight="800" fill="${p.greenText}" letter-spacing="-0.5">
    ✅ A-PAY WEB3 PAYWALL
  </text>
  
  <text x="585" y="465" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="600" fill="#065F46">
    • 1-Click micro-unlock ($0.05 per post)
  </text>
  <text x="585" y="515" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="600" fill="#065F46">
    • Zero forms: No email, passwords, KYC
  </text>
  <text x="585" y="565" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="600" fill="#065F46">
    • Flat 0.5% protocol fee (Keep 99.5%)
  </text>
  <text x="585" y="615" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="600" fill="#065F46">
    • HTTP 402 stops AI scraper server drain
  </text>
  <text x="585" y="665" font-family="Inter, -apple-system, sans-serif" font-size="19" font-weight="600" fill="#065F46">
    • 2-Second settlement on Base L2
  </text>

  <!-- Call-to-Action Bar -->
  <rect x="95" y="745" width="890" height="135" rx="24" fill="${p.primaryLight}" stroke="${p.primary}" stroke-width="2" />
  <text x="135" y="800" font-family="Inter, -apple-system, sans-serif" font-size="32" font-weight="800" fill="${p.primary}" letter-spacing="-0.5">
    💬 COMMENT "PAYWALL" BELOW
  </text>
  <text x="135" y="845" font-family="Inter, -apple-system, sans-serif" font-size="22" font-weight="600" fill="${p.textDark}">
    I'll send you the 1-click WordPress plugin setup guide &amp; live interactive demo!
  </text>

  <!-- Footer Verification Badge -->
  <text x="95" y="930" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${p.textMuted}">
    Verified on WordPress.org: "A-Pay Web3 AI Paywall" • Built on Base L2 (Coinbase)
  </text>
</svg>`;
}

async function run() {
  console.log("Generating 4 Big-Tech Light Palette Sample Graphics...");
  for (const p of PALETTES) {
    const svg = buildSVG(p);
    const outPng = path.join(OUTPUT_DIR, `${p.id}.png`);
    await sharp(Buffer.from(svg)).png({ quality: 100 }).toFile(outPng);
    console.log(`✅ Generated: ${outPng} (${p.name})`);
  }
  console.log("All 4 sample images successfully generated in 1080x1080 HD!");
}

run().catch(console.error);
