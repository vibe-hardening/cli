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

export const metadata: Metadata = {
  title: 'vibe-hardening / one-command security scanner for AI-generated code',
  description:
    'Vibe coded. Vibe hardened. Security scanner built for v0, Lovable, Bolt, Cursor and Claude Code output. 0 config, 5 seconds.',
  metadataBase: new URL('https://vibe-hardening.io'),
  openGraph: {
    title: 'vibe-hardening',
    description: 'One-command security scanner for AI-generated code.',
    url: 'https://vibe-hardening.io',
    siteName: 'vibe-hardening',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vibe-hardening',
    description: 'One-command security scanner for AI-generated code.',
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
        <script dangerouslySetInnerHTML={{ __html: prePaintTheme }} />
      </head>
      <body className="scanlines noise">{children}</body>
    </html>
  );
}
