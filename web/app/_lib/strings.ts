export type Locale = 'en' | 'zh';

export interface Strings {
  title: string;
  nav: {
    source: string;
    waitlist: string;
    langOther: string;
    langOtherHref: string;
  };
  topStrip: { online: string };
  hero: {
    line1: string;
    line2: string;
    execLabel: string;
    execVersion: string;
    cmd: string;
  };
  features: { unit: string; title: string; meta: string }[];
  terminal: { label: string; rec: string };
  waitlist: {
    title1: string;
    title2: string;
    placeholder: string;
    submit: string;
  };
  footer: { copyright: string; github: string; npm: string; twitter: string };
}

export const strings: Record<Locale, Strings> = {
  en: {
    title:
      'vibe-hardening / one-command security scanner for AI-generated code',
    nav: {
      source: 'SOURCE ↗',
      waitlist: 'WAITLIST',
      langOther: '中文',
      langOtherHref: '/zh',
    },
    topStrip: { online: 'ONLINE' },
    hero: {
      line1: 'VIBE CODED.',
      line2: 'VIBE HARDENED.',
      execLabel: '>>> EXECUTE',
      execVersion: '0.0.1-PREVIEW',
      cmd: 'npx vibe-hardening scan',
    },
    features: [
      { unit: '001', title: 'AI-AWARE\nRULES', meta: 'DB-01' },
      { unit: '002', title: 'PLATFORM\nFINGERPRINT', meta: 'FN-09' },
      { unit: '003', title: 'LIVE SECRET\nVERIFY', meta: 'VR-04' },
    ],
    terminal: { label: '/DEV/TTY/VH-001', rec: 'REC' },
    waitlist: {
      title1: 'SHIP',
      title2: 'HARDENED.',
      placeholder: 'you@domain.com',
      submit: 'SUBSCRIBE →',
    },
    footer: {
      copyright: '© 2026 VIBE-HARDENING',
      github: 'GITHUB',
      npm: 'NPM',
      twitter: 'TWITTER',
    },
  },
  zh: {
    title: 'vibe-hardening｜AI 生成程式碼的一鍵資安掃描工具',
    nav: {
      source: '原始碼 ↗',
      waitlist: '候補名單',
      langOther: 'EN',
      langOtherHref: '/',
    },
    topStrip: { online: '運行中' },
    hero: {
      line1: 'VIBE CODED.',
      line2: 'VIBE HARDENED.',
      execLabel: '>>> 執行',
      execVersion: '0.0.1-PREVIEW',
      cmd: 'npx vibe-hardening scan',
    },
    features: [
      { unit: '001', title: 'AI 專屬\n規則庫', meta: 'DB-01' },
      { unit: '002', title: '平台指紋\n辨識', meta: 'FN-09' },
      { unit: '003', title: '密鑰即時\n驗證', meta: 'VR-04' },
    ],
    terminal: { label: '/DEV/TTY/VH-001', rec: '錄製' },
    waitlist: {
      title1: '安心',
      title2: '上線。',
      placeholder: 'you@domain.com',
      submit: '訂閱 →',
    },
    footer: {
      copyright: '© 2026 VIBE-HARDENING',
      github: 'GITHUB',
      npm: 'NPM',
      twitter: 'TWITTER',
    },
  },
};
