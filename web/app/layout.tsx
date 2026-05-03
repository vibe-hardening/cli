import type { Metadata } from 'next';
import {
  JetBrains_Mono,
  Archivo_Black,
  Noto_Sans_TC,
  EB_Garamond,
} from 'next/font/google';
import './globals.css';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

const display = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display-loaded',
  display: 'swap',
});

const displayZh = Noto_Sans_TC({
  subsets: ['latin'],
  weight: '900',
  variable: '--font-display-zh-loaded',
  display: 'swap',
});

const serif = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['italic', 'normal'],
  variable: '--font-serif-loaded',
  display: 'swap',
});

// Social-preview metadata (FB / X / LinkedIn / Slack unfurls).
// Lengths tuned per opengraph.xyz audit: title 55-60 chars,
// description 110-160 chars. The browser-tab `<title>` (first
// `title` field below) stays longer for SEO; OG/Twitter overrides
// keep the social preview tight and benefit-driven.
const OG_TITLE = 'vibe-hardening — security scanner for AI-generated code';
const OG_DESCRIPTION =
  'Vibe coded. Vibe hardened. One npx command, 51 rules, 9 live secret verifiers. Built for output from Cursor, Lovable, Bolt, v0, Claude Code. MIT.';

export const metadata: Metadata = {
  title: 'vibe-hardening / one-command security scanner for AI-generated code',
  description: OG_DESCRIPTION,
  metadataBase: new URL('https://vibe-hardening.io'),
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: 'https://vibe-hardening.io',
    siteName: 'vibe-hardening',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'vibe-hardening — one-command security scanner for AI-generated code',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pre-paint theme script. Reads localStorage synchronously before
  // first paint and applies `data-theme="light"` to the root if the
  // user toggled to light on a prior visit. Without this, returning
  // light-mode visitors see a dark flash before hydration runs.
  // Wrapped in a try/catch so private-mode browsers (where
  // localStorage throws on access) never block rendering.
  const prePaintTheme = `
    try {
      var t = localStorage.getItem('vh-theme');
      if (t === 'light') document.documentElement.dataset.theme = 'light';
    } catch (e) {}
  `;

  return (
    <html
      lang="en"
      className={`${mono.variable} ${display.variable} ${displayZh.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* vibe-hardening-disable-next-line vh-inj-xss-dangerous-html */}
        <script dangerouslySetInnerHTML={{ __html: prePaintTheme }} />
      </head>
      <body className="scanlines noise">{children}</body>
    </html>
  );
}
