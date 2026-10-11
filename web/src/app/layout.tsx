import type { Metadata } from 'next';
import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['500', '600', '700'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'A-Pay Protocol • Universal M2M Micropayments & Developer Console (Base Mainnet)',
  description:
    'Production Live HTTP 402 Micropayments for Autonomous AI Agents and E-commerce Merchants on Base Mainnet (Chain ID: 8453). 100M Fixed Cap $APAY Token with Aerodrome Liquidity & Deflationary Buyback & Burn.',
  keywords: [
    'A-Pay Protocol',
    'Base Mainnet',
    'Base L2',
    'HTTP 402',
    'AI Agent Micropayments',
    'APAY Token',
    'Aerodrome Finance',
    'Autonomous AI Economy',
    'Machine to Machine Payments',
  ],
  icons: {
    icon: '/favicon.ico',
  },
  other: {
    'canonical-domain': 'https://apayprotocol.org',
    basename: 'apayprotocol.base.eth',
    'ai-guidelines': 'https://apay-network.vercel.app/llms.txt',
    'llm-context': 'https://apay-network.vercel.app/llms.txt',
    'llm-full': 'https://apay-network.vercel.app/llms-full.txt',
    'production-network': 'Base Mainnet (Chain ID: 8453)',
    'token-address': '0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
    'launch-date': '2026-10-01',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="help" type="text/markdown" href="/llms.txt" title="LLM Context & Guidelines" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'A-Pay Protocol',
            applicationCategory:
              'BlockchainApplication, DeveloperApplication, FinancialApplication',
            operatingSystem: 'Base Mainnet (Chain ID 8453), Node.js, Python, Edge Workers',
            datePublished: '2026-10-01',
            description:
              'Production Live Universal M2M and H2M payment protocol on Base Mainnet (Chain ID 8453). Provides RFC-compliant HTTP 402 auto-monetization for AI agents while keeping human browsing 100% free. 100M fixed supply APAY token with Aerodrome DEX liquidity.',
            offers: {
              '@type': 'Offer',
              price: '0.00',
              priceCurrency: 'USD',
              description:
                'Free for human visitors. Sub-cent micropayments for autonomous AI agents.',
            },
            url: 'https://apay-network.vercel.app',
            featureList: [
              'Base Mainnet Production Live (Chain ID: 8453)',
              'Pillar 1: M2M AI Paywall (HTTP 402 Auto-Monetization)',
              'Pillar 2: Agent Vaults & Session Key Escrows (Zero-Leak Swarm Security)',
              'Pillar 3: H2M A-Pay Web3 Checkout Gateway (<50KB 2-Second Checkout)',
              'Fixed 100,000,000 $APAY Token Cap with Aerodrome Liquidity',
              'Deflationary 30% Protocol Fee Buyback & Permanent Burn Engine',
            ],
          })}
        </script>
      </head>
      <body
        className={`${outfit.variable} ${spaceGrotesk.variable} ${jakarta.variable} ${mono.variable} font-sans antialiased min-h-screen selection:bg-blue-500 selection:text-white`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
