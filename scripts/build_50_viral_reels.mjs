import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('../web/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REELS_OUTPUT_DIR = path.resolve(__dirname, 'assets/rendered_reels');
const FRAMES_TEMP_DIR = path.resolve(__dirname, 'assets/reel_temp_frames');
const AUDIO_DIR = path.resolve(__dirname, 'assets/audio');

fs.mkdirSync(REELS_OUTPUT_DIR, { recursive: true });
fs.mkdirSync(FRAMES_TEMP_DIR, { recursive: true });

// 4 Modern Light Big-Tech Palettes
const PALETTES = [
  {
    id: 'stripe_blue',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#0052FF',
    primaryLight: '#EFF6FF',
    accent: '#2563EB',
    textDark: '#0F172A',
    textMuted: '#64748B',
    pillBg: '#EFF6FF',
    pillText: '#0052FF',
    alertBg: '#FEF2F2',
    alertBorder: '#FECACA',
    alertText: '#DC2626',
    greenBg: '#ECFDF5',
    greenText: '#059669',
  },
  {
    id: 'linear_slate',
    bg: '#F1F5F9',
    cardBg: '#FFFFFF',
    border: '#CBD5E1',
    primary: '#475569',
    primaryLight: '#F8FAFC',
    accent: '#F97316',
    textDark: '#020617',
    textMuted: '#64748B',
    pillBg: '#FFF7ED',
    pillText: '#EA580C',
    alertBg: '#FEF2F2',
    alertBorder: '#FECACA',
    alertText: '#B91C1C',
    greenBg: '#F0FDF4',
    greenText: '#15803D',
  },
  {
    id: 'openai_emerald',
    bg: '#F8FAF9',
    cardBg: '#FFFFFF',
    border: '#E5E7EB',
    primary: '#10A37F',
    primaryLight: '#ECFDF5',
    accent: '#059669',
    textDark: '#111827',
    textMuted: '#6B7280',
    pillBg: '#ECFDF5',
    pillText: '#047857',
    alertBg: '#FEF2F2',
    alertBorder: '#FECACA',
    alertText: '#DC2626',
    greenBg: '#ECFDF5',
    greenText: '#047857',
  },
  {
    id: 'saas_amber',
    bg: '#FAFAF9',
    cardBg: '#FFFFFF',
    border: '#E7E5E4',
    primary: '#D97706',
    primaryLight: '#FEF3C7',
    accent: '#0284C7',
    textDark: '#1C1917',
    textMuted: '#78716C',
    pillBg: '#FEF3C7',
    pillText: '#B45309',
    alertBg: '#FEF2F2',
    alertBorder: '#FECACA',
    alertText: '#DC2626',
    greenBg: '#ECFDF5',
    greenText: '#059669',
  }
];

// 10 Distinct Trending Audio Tracks
const AUDIO_TRACKS = [
  'cyberpunk_pulse_126bpm.wav',
  'dark_phonk_drill_135bpm.wav',
  'fintech_minimal_house_124bpm.wav',
  'cinematic_sub_tension_130bpm.wav',
  'future_bass_anthem_128bpm.wav',
  'lofi_tech_chill_112bpm.wav',
  'industrial_warehouse_132bpm.wav',
  'arcade_8bit_drive_120bpm.wav',
  'deep_crypto_glitch_125bpm.wav',
  'hypnotic_deepwave_122bpm.wav'
];

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current += ' ' + w;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function buildSvgFrame1(hook, p, idx) {
  const lines = wrapText(hook, 24).slice(0, 4);
  const headlineSvg = lines.map((l, i) => `
    <text x="120" y="${560 + i * 85}" font-family="Inter, system-ui, sans-serif" font-size="64" font-weight="900" fill="${p.textDark}" letter-spacing="-2">
      ${escapeXml(l)}
    </text>
  `).join('');

  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow1" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.06" />
      </filter>
    </defs>

    <rect width="1080" height="1920" fill="${p.bg}" />
    <rect x="60" y="220" width="960" height="1480" rx="44" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2" filter="url(#shadow1)" />

    <!-- Badges -->
    <rect x="120" y="300" width="260" height="52" rx="26" fill="${p.primaryLight}" />
    <text x="145" y="333" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="${p.primary}" letter-spacing="1">⚡ A-PAY PROTOCOL</text>

    <rect x="680" y="300" width="280" height="52" rx="26" fill="${p.pillBg}" />
    <text x="705" y="333" font-family="Inter, sans-serif" font-size="16" font-weight="800" fill="${p.pillText}" letter-spacing="0.5">REEL #${String(idx).padStart(2, '0')} • VIRAL B2B</text>

    <!-- Shock Hook -->
    ${headlineSvg}

    <!-- Callout Box -->
    <rect x="120" y="980" width="840" height="260" rx="28" fill="${p.alertBg}" stroke="${p.alertBorder}" stroke-width="2" />
    <text x="160" y="1040" font-family="Inter, sans-serif" font-size="28" font-weight="900" fill="${p.alertText}">⚠️ THE MONETIZATION COLLAPSE</text>
    <text x="160" y="1100" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• AdSense RPMs down 60%+ in 2026</text>
    <text x="160" y="1150" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• 42% tech readers block ads completely</text>
    <text x="160" y="1200" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• AI crawlers drain gigabytes for \$0</text>

    <!-- Bottom Indicator -->
    <rect x="120" y="1520" width="840" height="90" rx="24" fill="${p.primaryLight}" />
    <text x="160" y="1575" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="${p.primary}">👉 SWIPE / WATCH SOLUTION IN 3 SECONDS...</text>
  </svg>`;
}

function buildSvgFrame2(p, idx) {
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow2" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.06" />
      </filter>
    </defs>

    <rect width="1080" height="1920" fill="${p.bg}" />
    <rect x="60" y="220" width="960" height="1480" rx="44" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2" filter="url(#shadow2)" />

    <!-- Badges -->
    <rect x="120" y="300" width="300" height="52" rx="26" fill="${p.alertBg}" />
    <text x="145" y="333" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="${p.alertText}">📉 LEGACY ADS VS REALITY</text>

    <text x="120" y="460" font-family="Inter, sans-serif" font-size="52" font-weight="900" fill="${p.textDark}" letter-spacing="-1.5">
      The \$0.30 Fee Trap
    </text>
    <text x="120" y="525" font-family="Inter, sans-serif" font-size="30" font-weight="600" fill="${p.textMuted}">
      Why traditional Stripe &amp; PayPal kill micro-paywalls
    </text>

    <!-- Comparison Cards -->
    <rect x="120" y="600" width="840" height="340" rx="28" fill="${p.alertBg}" stroke="${p.alertBorder}" stroke-width="2" />
    <text x="160" y="660" font-family="Inter, sans-serif" font-size="28" font-weight="900" fill="${p.alertText}">❌ TRADITIONAL STRIPE / PAYPAL</text>
    <text x="160" y="720" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• Fixed fee: \$0.30 + 2.9% on EVERY checkout</text>
    <text x="160" y="770" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• Selling a \$0.05 article? You LOSE \$0.25!</text>
    <text x="160" y="820" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• 10 mandatory form fields = 85% drop-off</text>
    <text x="160" y="870" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• 2-3 business days payout delays</text>

    <rect x="120" y="990" width="840" height="340" rx="28" fill="${p.greenBg}" stroke="#A7F3D0" stroke-width="2" />
    <text x="160" y="1050" font-family="Inter, sans-serif" font-size="28" font-weight="900" fill="${p.greenText}">✅ BASE L2 MICRO-SETTLEMENT (A-PAY)</text>
    <text x="160" y="1110" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• Sub-cent gas fees (&lt; \$0.001) on Base L2</text>
    <text x="160" y="1160" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• Charge \$0.01 to \$0.05 profitably!</text>
    <text x="160" y="1210" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• 1-Click tap with EVM session keys</text>
    <text x="160" y="1260" font-family="Inter, sans-serif" font-size="24" font-weight="600" fill="${p.textDark}">• Instant non-custodial wallet deposit</text>

    <!-- Bottom Indicator -->
    <rect x="120" y="1520" width="840" height="90" rx="24" fill="${p.primaryLight}" />
    <text x="160" y="1575" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="${p.primary}">⚡ HOW TO SETUP IN 2 MINUTES...</text>
  </svg>`;
}

function buildSvgFrame3(p, idx) {
  return `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow3" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.06" />
      </filter>
    </defs>

    <rect width="1080" height="1920" fill="${p.bg}" />
    <rect x="60" y="220" width="960" height="1480" rx="44" fill="${p.cardBg}" stroke="${p.border}" stroke-width="2" filter="url(#shadow3)" />

    <!-- Badges -->
    <rect x="120" y="300" width="340" height="52" rx="26" fill="${p.greenBg}" />
    <text x="145" y="333" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="${p.greenText}">🚀 OFFICIAL WORDPRESS PLUGIN</text>

    <text x="120" y="460" font-family="Inter, sans-serif" font-size="52" font-weight="900" fill="${p.textDark}" letter-spacing="-1.5">
      Monetize in 1-Click
    </text>
    <text x="120" y="525" font-family="Inter, sans-serif" font-size="30" font-weight="600" fill="${p.textMuted}">
      A-Pay Web3 AI Paywall on Base L2
    </text>

    <!-- Feature Checklist -->
    <rect x="120" y="600" width="840" height="480" rx="28" fill="${p.primaryLight}" stroke="${p.border}" stroke-width="2" />
    <text x="160" y="660" font-family="Inter, sans-serif" font-size="28" font-weight="900" fill="${p.primary}">🔥 3 WAYS YOU MAKE MONEY TODAY:</text>
    
    <text x="160" y="730" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="${p.textDark}">1. 🤖 HTTP 402 AI Scraper Paywall</text>
    <text x="195" y="775" font-family="Inter, sans-serif" font-size="20" font-weight="500" fill="${p.textMuted}">AI bots either pay per article scraped or get 402 blocked.</text>

    <text x="160" y="845" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="${p.textDark}">2. ⚡ 1-Tap Human Micro-Paywalls</text>
    <text x="195" y="890" font-family="Inter, sans-serif" font-size="20" font-weight="500" fill="${p.textMuted}">Readers pay \$0.05 instantly with Coinbase Wallet or MetaMask.</text>

    <text x="160" y="960" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="${p.textDark}">3. 💰 Non-Custodial Direct Settlement</text>
    <text x="195" y="1005" font-family="Inter, sans-serif" font-size="20" font-weight="500" fill="${p.textMuted}">Funds go straight to your personal EVM wallet. 0% middlemen.</text>

    <!-- Action Box -->
    <rect x="120" y="1140" width="840" height="260" rx="28" fill="${p.cardBg}" stroke="${p.primary}" stroke-width="3" />
    <text x="160" y="1205" font-family="Inter, sans-serif" font-size="26" font-weight="900" fill="${p.primary}">📥 INSTALL FREE FROM WORDPRESS ADMIN:</text>
    <text x="160" y="1265" font-family="Inter, sans-serif" font-size="28" font-weight="800" fill="${p.textDark}">Plugins &gt; Add New &gt; Search:</text>
    <text x="160" y="1330" font-family="Inter, sans-serif" font-size="34" font-weight="900" fill="${p.primary}">"A-Pay Web3 AI Paywall"</text>

    <!-- Bottom Indicator -->
    <rect x="120" y="1520" width="840" height="90" rx="24" fill="${p.greenBg}" />
    <text x="160" y="1575" font-family="Inter, sans-serif" font-size="24" font-weight="800" fill="${p.greenText}">💬 COMMENT "PAYWALL" FOR 1-CLICK DEMO</text>
  </svg>`;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

async function renderReel(item, idx) {
  const p = PALETTES[idx % PALETTES.length];
  const audioTrack = AUDIO_TRACKS[idx % AUDIO_TRACKS.length];
  const audioPath = path.join(AUDIO_DIR, audioTrack);

  const f1Path = path.join(FRAMES_TEMP_DIR, `reel_${idx}_f1.png`);
  const f2Path = path.join(FRAMES_TEMP_DIR, `reel_${idx}_f2.png`);
  const f3Path = path.join(FRAMES_TEMP_DIR, `reel_${idx}_f3.png`);

  const svg1 = buildSvgFrame1(item.hook, p, idx + 1);
  const svg2 = buildSvgFrame2(p, idx + 1);
  const svg3 = buildSvgFrame3(p, idx + 1);

  await sharp(Buffer.from(svg1)).png().toFile(f1Path);
  await sharp(Buffer.from(svg2)).png().toFile(f2Path);
  await sharp(Buffer.from(svg3)).png().toFile(f3Path);

  const outMp4 = path.join(REELS_OUTPUT_DIR, `reel_${String(idx + 1).padStart(2, '0')}.mp4`);
  const concatTxt = path.join(FRAMES_TEMP_DIR, `concat_${idx}.txt`);

  // 12-second vertical video: 4s Frame 1, 4s Frame 2, 4s Frame 3
  const c1 = path.join(FRAMES_TEMP_DIR, `c1_${idx}.mp4`);
  const c2 = path.join(FRAMES_TEMP_DIR, `c2_${idx}.mp4`);
  const c3 = path.join(FRAMES_TEMP_DIR, `c3_${idx}.mp4`);

  execSync(`ffmpeg -y -loop 1 -i "${f1Path}" -vf "scale=1080:1920,setsar=1" -t 4 -c:v libx264 -pix_fmt yuv420p -r 25 "${c1}" 2>/dev/null`);
  execSync(`ffmpeg -y -loop 1 -i "${f2Path}" -vf "scale=1080:1920,setsar=1" -t 4 -c:v libx264 -pix_fmt yuv420p -r 25 "${c2}" 2>/dev/null`);
  execSync(`ffmpeg -y -loop 1 -i "${f3Path}" -vf "scale=1080:1920,setsar=1" -t 4 -c:v libx264 -pix_fmt yuv420p -r 25 "${c3}" 2>/dev/null`);

  fs.writeFileSync(concatTxt, `file '${c1}'\nfile '${c2}'\nfile '${c3}'\n`);

  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${outMp4}" 2>/dev/null`);

  // Clean temporary clips
  try {
    fs.unlinkSync(c1);
    fs.unlinkSync(c2);
    fs.unlinkSync(c3);
    fs.unlinkSync(concatTxt);
    fs.unlinkSync(f1Path);
    fs.unlinkSync(f2Path);
    fs.unlinkSync(f3Path);
  } catch (e) {}

  return {
    index: idx + 1,
    file: outMp4,
    palette: p.id,
    audio: audioTrack,
    hook: item.hook,
    body: item.body,
    cta: item.cta,
    hashtags: item.hashtags
  };
}

async function main() {
  const queuePath = path.resolve(__dirname, 'posts_100_queue.json');
  const allPosts = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
  const targetCount = parseInt(process.argv[2] || '50', 10);
  const posts = allPosts.slice(0, targetCount);

  console.log(`🎬 Rendering ${posts.length} unique video reels (1080x1920 vertical)...`);

  const results = [];
  for (let i = 0; i < posts.length; i++) {
    const start = Date.now();
    const res = await renderReel(posts[i], i);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${i + 1}/${posts.length}] Rendered reel_${String(i + 1).padStart(2, '0')}.mp4 (${elapsed}s) | Palette: ${res.palette} | Audio: ${res.audio}`);
    results.push(res);
  }

  // Save Reels Ledger
  const ledgerPath = path.resolve(__dirname, 'reels_50_queue.json');
  fs.writeFileSync(ledgerPath, JSON.stringify(results, null, 2));
  console.log(`\n🎉 All ${results.length} Reels rendered and saved to ${ledgerPath}!`);
}

main().catch(err => {
  console.error("❌ Error rendering reels:", err);
  process.exit(1);
});
