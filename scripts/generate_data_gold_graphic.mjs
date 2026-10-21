import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('../web/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, 'assets/generated_graphics');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Modern Big-Tech Light Palette (Stripe & Base Electric)
const p = {
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
  goldAccent: '#D97706',
  goldBg: '#FEF3C7'
};

function buildSVG() {
  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#000000" flood-opacity="0.04" />
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.02" />
    </filter>
  </defs>

  <!-- Clean Light Canvas -->
  <rect width="1080" height="1080" fill="${p.bg}" />

  <!-- Main Floating Card -->
  <rect x="50" y="50" width="980" height="980" rx="36" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2" filter="url(#cardShadow)" />

  <!-- Top Badges -->
  <rect x="95" y="95" width="220" height="44" rx="22" fill="${p.primaryLight}" />
  <text x="115" y="123" font-family="Inter, -apple-system, sans-serif" font-size="16" font-weight="700" fill="${p.primary}" letter-spacing="1">⚡ A-PAY PROTOCOL</text>

  <rect x="715" y="95" width="270" height="44" rx="22" fill="${p.goldBg}" />
  <text x="735" y="123" font-family="Inter, -apple-system, sans-serif" font-size="15" font-weight="700" fill="${p.goldAccent}" letter-spacing="0.5">🪙 DATA IS THE NEW GOLD</text>

  <!-- Provocative Ego Hook Headline -->
  <text x="95" y="210" font-family="Inter, -apple-system, sans-serif" font-size="52" font-weight="900" fill="${p.textDark}" letter-spacing="-1.5">
    AI doesn't need your water.
  </text>
  <text x="95" y="272" font-family="Inter, -apple-system, sans-serif" font-size="52" font-weight="900" fill="${p.primary}" letter-spacing="-1.5">
    It needs your DATA.
  </text>

  <!-- Subtitle -->
  <text x="95" y="325" font-family="Inter, -apple-system, sans-serif" font-size="23" font-weight="500" fill="${p.textMuted}">
    Gold is just metal. Your original content is the world's most valuable asset:
  </text>

  <!-- Comparison Grid -->
  <!-- Left Box: The Bleed -->
  <rect x="95" y="365" width="430" height="345" rx="24" fill="${p.redBg}" stroke="${p.redBorder}" stroke-width="1.5" />
  <text x="125" y="410" font-family="Inter, -apple-system, sans-serif" font-size="22" font-weight="800" fill="${p.redText}" letter-spacing="-0.5">
    ❌ GIVING AWAY THE GOLD
  </text>
  
  <text x="125" y="460" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#991B1B">
    • AI bots scrape your blog for free
  </text>
  <text x="125" y="508" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#991B1B">
    • They train $100B models on your work
  </text>
  <text x="125" y="556" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#991B1B">
    • 42% readers use ad-blockers ($0 RPM)
  </text>
  <text x="125" y="604" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#991B1B">
    • Server bandwidth drain spikes hosting
  </text>
  <text x="125" y="652" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#991B1B">
    • You pay bills while AI makes billions
  </text>

  <!-- Right Box: The 10X Solution -->
  <rect x="555" y="365" width="430" height="345" rx="24" fill="${p.greenBg}" stroke="${p.greenBorder}" stroke-width="1.5" />
  <text x="585" y="410" font-family="Inter, -apple-system, sans-serif" font-size="22" font-weight="800" fill="${p.greenText}" letter-spacing="-0.5">
    ✅ A-PAY WEB3 AI PAYWALL
  </text>
  
  <text x="585" y="460" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#065F46">
    • HTTP 402 makes AI pay per request
  </text>
  <text x="585" y="508" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#065F46">
    • Proprietary data locked &amp; protected
  </text>
  <text x="585" y="556" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#065F46">
    • Real humans 1-click micro-pay ($0.05)
  </text>
  <text x="585" y="604" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#065F46">
    • Server load &amp; bandwidth cut by 50%
  </text>
  <text x="585" y="652" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#065F46">
    • Instant 2-sec settlement on Base L2
  </text>

  <!-- Call-to-Action Bar -->
  <rect x="95" y="745" width="890" height="135" rx="24" fill="${p.primaryLight}" stroke="${p.primary}" stroke-width="2" />
  <text x="135" y="800" font-family="Inter, -apple-system, sans-serif" font-size="32" font-weight="800" fill="${p.primary}" letter-spacing="-0.5">
    💬 COMMENT "DATA" BELOW
  </text>
  <text x="135" y="845" font-family="Inter, -apple-system, sans-serif" font-size="22" font-weight="600" fill="${p.textDark}">
    I'll send you the 1-click WordPress plugin setup guide &amp; live interactive demo!
  </text>

  <!-- Footer Verification Badge -->
  <text x="95" y="930" font-family="Inter, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${p.textMuted}">
    Search on WordPress.org: "A-Pay Web3 AI Paywall" (Plugins &gt; Add New) • Base L2
  </text>
</svg>`;
}

async function render() {
  const svg = buildSVG();
  const outPng = path.join(OUTPUT_DIR, 'ai_needs_data_not_water.png');
  await sharp(Buffer.from(svg)).png({ quality: 100 }).toFile(outPng);
  console.log(`Rendered: ${outPng}`);
  return outPng;
}

render().catch(console.error);
