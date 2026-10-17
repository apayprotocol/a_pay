import type { Metadata } from 'next';
import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from 'next-themes';
import { AlienBotFlyer } from '@/components/AlienBotFlyer';
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
  metadataBase: new URL('https://apayprotocol.org'),
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
    'Coinbase AgentKit Micropayments',
    'Model Context Protocol MCP Payments',
  ],
  alternates: {
    canonical: 'https://apayprotocol.org',
  },
  openGraph: {
    title: 'A-Pay Protocol • Universal M2M Micropayments & Developer Console',
    description:
      'Production Live HTTP 402 Micropayments for Autonomous AI Agents and E-commerce Merchants on Base Mainnet. 100M Fixed Cap $APAY Token with Aerodrome Liquidity.',
    url: 'https://apayprotocol.org',
    siteName: 'A-Pay Protocol',
    images: [
      {
        url: '/brand/apay-official-logo.png',
        width: 1024,
        height: 1024,
        alt: 'A-Pay Protocol Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A-Pay Protocol • Universal M2M Micropayments (Base Mainnet)',
    description:
      'Production Live HTTP 402 Micropayments for Autonomous AI Agents and E-commerce Merchants on Base Mainnet (Chain ID: 8453).',
    site: '@apayprotocol',
    creator: '@apayprotocol',
    images: ['/brand/apay-official-logo.png'],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || '',
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/brand/apay-mark-transparent.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/apay-icon-dark-128.png',
  },
  other: {
    'canonical-domain': 'https://apayprotocol.org',
    basename: 'apayprotocol.base.eth',
    'ai-guidelines': 'https://apayprotocol.org/llms.txt',
    'llm-context': 'https://apayprotocol.org/llms.txt',
    'llm-full': 'https://apayprotocol.org/llms-full.txt',
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <link rel="help" type="text/markdown" href="/llms.txt" title="LLM Context & Guidelines" />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://apayprotocol.org/#organization',
                name: 'A-Pay Protocol',
                url: 'https://apayprotocol.org',
                logo: 'https://apayprotocol.org/brand/apay-official-logo.png',
                sameAs: [
                  'https://x.com/apayprotocol',
                  'https://discord.gg/cW2WRSfb35',
                  'https://github.com/apayprotocol',
                  'https://gitlab.com/apayprotocol/a_pay',
                  'https://www.reddit.com/r/A_Pay_Protocol/',
                  'https://www.linkedin.com/company/a-pay-protocol/',
                  'https://www.youtube.com/@a_payprotocol',
                  'https://www.instagram.com/apayprotocol/',
                  'https://www.facebook.com/apayprotocol',
                ],
              },
              {
                '@type': 'WebSite',
                '@id': 'https://apayprotocol.org/#website',
                url: 'https://apayprotocol.org',
                name: 'A-Pay Protocol',
                publisher: {
                  '@id': 'https://apayprotocol.org/#organization',
                },
                inLanguage: 'en-US',
              },
              {
                '@type': 'SoftwareApplication',
                '@id': 'https://apayprotocol.org/#software',
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
                url: 'https://apayprotocol.org',
                featureList: [
                  'Base Mainnet Production Live (Chain ID: 8453)',
                  'Pillar 1: M2M AI Paywall (HTTP 402 Auto-Monetization)',
                  'Pillar 2: Agent Vaults & Session Key Escrows (Zero-Leak Swarm Security)',
                  'Pillar 3: H2M A-Pay Web3 Checkout Gateway (<50KB 2-Second Checkout)',
                  'Fixed 100,000,000 $APAY Token Cap with Aerodrome Liquidity',
                  'Deflationary 30% Protocol Fee Buyback & Permanent Burn Engine',
                ],
              },
            ],
          })}
        </script>
      </head>
      <body
        className={`${outfit.variable} ${spaceGrotesk.variable} ${jakarta.variable} ${mono.variable} font-sans antialiased min-h-screen selection:bg-blue-500 selection:text-white`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <AlienBotFlyer />
        </ThemeProvider>
      </body>
    </html>
  );
}
