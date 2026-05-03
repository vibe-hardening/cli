import type { Metadata } from 'next';
import { PrivacyPage } from '../_components/PrivacyPage';

export const metadata: Metadata = {
  title: 'Privacy — vibe-hardening',
  description:
    'What the vibe-hardening CLI sends if you opt in to telemetry, what it never sends, and how to turn it off.',
  alternates: {
    languages: {
      en: '/privacy',
      'zh-Hant': '/zh/privacy',
    },
  },
};

export default function Page() {
  return <PrivacyPage locale="en" />;
}
