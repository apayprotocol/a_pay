import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('../web/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, 'assets/reel_assets');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Big-Tech Light Aesthetic (1080x1920 Vertical 9:16)
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

function buildFrame1() {
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.05" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="${p.bg}" />

  <!-- Floating Main Card -->
  <rect x="60" y="240" width="960" height="1440" rx="44" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2.5" filter="url(#cardShadow)" />

  <!-- Top Badges -->
  <rect x="120" y="320" width="240" height="52" rx="26" fill="${p.primaryLight}" />
  <text x="145" y="353" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="${p.primary}" letter-spacing="1">⚡ A-PAY PROTOCOL</text>

  <rect x="680" y="320" width="280" height="52" rx="26" fill="${p.goldBg}" />
  <text x="702" y="353" font-family="Inter, sans-serif" font-size="17" font-weight="800" fill="${p.goldAccent}" letter-spacing="0.5">🪙 DATA IS THE NEW GOLD</text>

  <!-- Massive Ego Hook Headline -->
  <text x="120" y="520" font-family="Inter, sans-serif" font-size="64" font-weight="900" fill="${p.textDark}" letter-spacing="-2">
    AI doesn't need
  </text>
  <text x="120" y="600" font-family="Inter, sans-serif" font-size="64" font-weight="900" fill="${p.textDark}" letter-spacing="-2">
    your water.
  </text>

  <text x="120" y="710" font-family="Inter, sans-serif" font-size="68" font-weight="900" fill="${p.primary}" letter-spacing="-2">
    It needs your DATA.
  </text>

  <!-- Subtitle Quote Box -->
  <rect x="120" y="800" width="840" height="240" rx="28" fill="#F1F5F9" />
  <text x="160" y="870" font-family="Inter, sans-serif" font-size="28" font-weight="600" fill="${p.textDark}">
    "In 2026, gold is just metal.
  </text>
  <text x="160" y="920" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="${p.primary}">
    Clean, verified human expertise
  </text>
  <text x="160" y="970" font-family="Inter, sans-serif" font-size="28" font-weight="600" fill="${p.textDark}">
    is the world's most valuable asset."
  </text>

  <!-- Stat Alert Box -->
  <rect x="120" y="1080" width="840" height="340" rx="28" fill="${p.redBg}" stroke="${p.redBorder}" stroke-width="2" />
  <text x="160" y="1150" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="${p.redText}">
    ⚠️ THE HARD REALITY:
  </text>
  <text x="160" y="1220" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="#991B1B">
    • AI models crawl thousands of blogs daily.
  </text>
  <text x="160" y="1275" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="#991B1B">
    • They train $100B algorithms on your work.
  </text>
  <text x="160" y="1330" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="#991B1B">
    • And publishers get paid exactly $0.00.
  </text>

  <!-- Bottom Pulse Bar -->
  <text x="120" y="1520" font-family="Inter, sans-serif" font-size="26" font-weight="700" fill="${p.primary}">
    Swipe / Watch next ➔ How to protect your content
  </text>
  <text x="120" y="1610" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="${p.textMuted}">
    Base L2 • Verified on WordPress: "A-Pay Web3 AI Paywall"
  </text>
</svg>`;
}

function buildFrame2() {
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.05" />
    </filter>
  </defs>

  <rect width="1080" height="1920" fill="${p.bg}" />
  <rect x="60" y="240" width="960" height="1440" rx="44" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2.5" filter="url(#cardShadow)" />

  <!-- Top Badges -->
  <rect x="120" y="320" width="240" height="52" rx="26" fill="${p.redBg}" />
  <text x="145" y="353" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="${p.redText}" letter-spacing="1">🚨 THE UNFAIR MISTAKE</text>

  <rect x="710" y="320" width="250" height="52" rx="26" fill="#F1F5F9" />
  <text x="735" y="353" font-family="Inter, sans-serif" font-size="17" font-weight="700" fill="${p.textMuted}">SERVER DRAIN</text>

  <text x="120" y="470" font-family="Inter, sans-serif" font-size="54" font-weight="900" fill="${p.redText}" letter-spacing="-1.5">
    Why give away the
  </text>
  <text x="120" y="540" font-family="Inter, sans-serif" font-size="54" font-weight="900" fill="${p.textDark}" letter-spacing="-1.5">
    new gold for free?
  </text>

  <text x="120" y="610" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="${p.textMuted}">
    Here is what is happening to your WordPress site right now:
  </text>

  <!-- Big Red Breakdown Box -->
  <rect x="120" y="660" width="840" height="680" rx="32" fill="${p.redBg}" stroke="${p.redBorder}" stroke-width="2" />
  
  <text x="165" y="730" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="${p.redText}">
    ❌ THE HIDDEN REVENUE BLEED:
  </text>

  <text x="165" y="810" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="#991B1B">
    1. AI bots crawl tutorials &amp; research 24/7
  </text>
  <text x="165" y="855" font-family="Inter, sans-serif" font-size="20" font-weight="400" fill="#7F1D1D">
     They summarize your answers so readers never visit your site.
  </text>

  <text x="165" y="940" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="#991B1B">
    2. Over 42% of readers block display ads
  </text>
  <text x="165" y="985" font-family="Inter, sans-serif" font-size="20" font-weight="400" fill="#7F1D1D">
     AdSense RPM collapsed to $1.50 pennies. Half your traffic = $0.
  </text>

  <text x="165" y="1070" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="#991B1B">
    3. Server bandwidth bills keep spiking
  </text>
  <text x="165" y="1115" font-family="Inter, sans-serif" font-size="20" font-weight="400" fill="#7F1D1D">
     You pay AWS &amp; host bills for crawlers that never buy anything.
  </text>

  <text x="165" y="1200" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="#991B1B">
    4. Traditional Stripe/PayPal fees kill micro-sales
  </text>
  <text x="165" y="1245" font-family="Inter, sans-serif" font-size="20" font-weight="400" fill="#7F1D1D">
     Stripe takes $0.30 fee on $0.50 post (60%+ fee loss!).
  </text>

  <!-- Bottom CTA Hook -->
  <text x="120" y="1420" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="${p.primary}">
    Here is the 10X Web3 solution ➔
  </text>
  <text x="120" y="1610" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="${p.textMuted}">
    Base L2 • Verified on WordPress: "A-Pay Web3 AI Paywall"
  </text>
</svg>`;
}

function buildFrame3() {
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.05" />
    </filter>
  </defs>

  <rect width="1080" height="1920" fill="${p.bg}" />
  <rect x="60" y="240" width="960" height="1440" rx="44" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2.5" filter="url(#cardShadow)" />

  <!-- Top Badges -->
  <rect x="120" y="320" width="280" height="52" rx="26" fill="${p.greenBg}" />
  <text x="145" y="353" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="${p.greenText}" letter-spacing="1">✅ THE SOVEREIGN FIX</text>

  <rect x="710" y="320" width="250" height="52" rx="26" fill="${p.primaryLight}" />
  <text x="735" y="353" font-family="Inter, sans-serif" font-size="17" font-weight="800" fill="${p.primary}">BASE L2 (2 SEC)</text>

  <text x="120" y="470" font-family="Inter, sans-serif" font-size="52" font-weight="900" fill="${p.greenText}" letter-spacing="-1.5">
    Lock your data.
  </text>
  <text x="120" y="540" font-family="Inter, sans-serif" font-size="52" font-weight="900" fill="${p.primary}" letter-spacing="-1.5">
    Monetize in 1 click.
  </text>

  <!-- Big Green Solution Box -->
  <rect x="120" y="600" width="840" height="540" rx="32" fill="${p.greenBg}" stroke="${p.greenBorder}" stroke-width="2" />
  
  <text x="165" y="665" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="${p.greenText}">
    ⚡ A-PAY WEB3 AI PAYWALL:
  </text>

  <text x="165" y="740" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#065F46">
    • HTTP 402 forces AI bots to pay micro-settlements
  </text>
  <text x="165" y="805" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#065F46">
    • Human readers 1-click unlock for $0.05
  </text>
  <text x="165" y="870" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#065F46">
    • Zero forms: No email, passwords, or credit cards
  </text>
  <text x="165" y="935" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#065F46">
    • Server load &amp; bandwidth cut by 50%
  </text>
  <text x="165" y="1000" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#065F46">
    • Flat 0.5% fee (You keep 99.5% of your money)
  </text>
  <text x="165" y="1065" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#065F46">
    • Instant 2-second settlement into your crypto wallet
  </text>

  <!-- High-Impact CTA Box -->
  <rect x="120" y="1180" width="840" height="220" rx="32" fill="${p.primaryLight}" stroke="${p.primary}" stroke-width="3" />
  <text x="165" y="1255" font-family="Inter, sans-serif" font-size="38" font-weight="900" fill="${p.primary}" letter-spacing="-0.5">
    💬 COMMENT "DATA" BELOW
  </text>
  <text x="165" y="1320" font-family="Inter, sans-serif" font-size="23" font-weight="600" fill="${p.textDark}">
    I'll send you the 1-click WordPress setup guide &amp; live demo!
  </text>

  <!-- Bottom Search Badge -->
  <rect x="120" y="1440" width="840" height="85" rx="20" fill="#F1F5F9" />
  <text x="155" y="1493" font-family="Inter, sans-serif" font-size="21" font-weight="700" fill="${p.textDark}">
    🔍 WordPress: Plugins &gt; Add New &gt; Search "A-Pay Web3 AI Paywall"
  </text>

  <text x="120" y="1610" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="${p.textMuted}">
    Base L2 • Non-Custodial Smart Contract Escrow
  </text>
</svg>`;
}

async function run() {
  console.log("Generating 1080x1920 (9:16) Vertical Reel Frames...");
  const f1 = path.join(OUTPUT_DIR, 'frame1.png');
  const f2 = path.join(OUTPUT_DIR, 'frame2.png');
  const f3 = path.join(OUTPUT_DIR, 'frame3.png');

  await sharp(Buffer.from(buildFrame1())).png().toFile(f1);
  await sharp(Buffer.from(buildFrame2())).png().toFile(f2);
  await sharp(Buffer.from(buildFrame3())).png().toFile(f3);

  console.log("✅ All 3 Reel frames generated in 1080x1920 HD!");
}

run().catch(console.error);
