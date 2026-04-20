import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Content-Security-Policy for the landing page.
//   - script-src allows 'unsafe-inline' because Next.js injects inline
//     bootstrap scripts; moving to nonces would require middleware.
//   - style-src allows fonts.googleapis.com (loaded via <link>) and
//     'unsafe-inline' for styled-jsx / inline style props.
//   - font-src allows fonts.gstatic.com (where Google Fonts serves woff2).
//   - form-action whitelists Formspree so the waitlist submit still works.
//   - frame-ancestors 'none' + X-Frame-Options: DENY prevent clickjacking.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "form-action 'self' https://formspree.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default config;
