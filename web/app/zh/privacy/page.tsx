import type { Metadata } from 'next';
import { PrivacyPage } from '../../_components/PrivacyPage';

export const metadata: Metadata = {
  title: '隱私政策 — vibe-hardening',
  description:
    'opt-in 後 vibe-hardening CLI 會送什麼、絕對不送什麼、怎麼關。',
  alternates: {
    languages: {
      en: '/privacy',
      'zh-Hant': '/zh/privacy',
    },
  },
};

export default function Page() {
  return <PrivacyPage locale="zh" />;
}
