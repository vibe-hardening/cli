export type Locale = 'en' | 'zh';

export interface Strings {
  title: string;
  classbar: {
    unit: string;
    rev: string;
    geo: string;
    date: string;
  };
  nav: {
    source: string;
    docs: string;
    waitlist: string;
    langOther: string;
    langOtherHref: string;
  };
  hero: {
    eyebrow: string;
    line1: string;
    line2: string;
    copy: string;
    execLabel: string;
    execReady: string;
    cmd: string;
    footnote: string;
  };
  hud: {
    last24h: string;
    newCrit: string;
    newHigh: string;
    fixed: string;
    kRepos: string;
    vRepos: string;
    kKeys: string;
    vKeys: string;
    kScan: string;
    vScan: string;
    kFail: string;
    vFail: string;
    fingerprintTitle: string;
  };
  terminal: {
    liveFeed: string;
    demo: string;
    verdictLabel: string;
    shipQ: string;
    shipA: string;
    tagTop: string;
    tagBottom: string;
    headLabel: string;
  };
  features: {
    label1: string;
    label2: string;
    items: { code: string; title: string; body: string }[];
  };
  quotes: { q: string; a: string }[];
  pricing: {
    freeTag: string;
    freeTitle: string;
    freeBody: string;
    proTag: string;
    proTitle: string;
    proBody: string;
    proCta: string;
  };
  waitlist: {
    title1: string;
    title2: string;
    subtitleA: string;
    subtitleHighlight: string;
    subtitleB: string;
    placeholder: string;
    submit: string;
  };
  footer: {
    brandCopy: string;
    colProductTitle: string;
    colProductItems: string[];
    colSourceTitle: string;
    colSourceItems: { label: string; href: string }[];
    colStatusTitle: string;
    colStatusItems: string[];
    ruleDomains: string;
    tagline: string;
  };
}

export const strings: Record<Locale, Strings> = {
  en: {
    title:
      'vibe-hardening / one-command security scanner for AI-generated code',
    classbar: {
      unit: '▲ VH-001 · FOR THE VIBE CODER ·',
      rev: 'REV 0.0.12 · CHAN 12',
      geo: 'LAT 25.03°N · LNG 121.56°E',
      date: '▲ 2026-04-20 ▲',
    },
    nav: {
      source: 'Source ↗',
      docs: 'Docs',
      waitlist: 'Waitlist',
      langOther: '中文',
      langOtherHref: '/zh',
    },
    hero: {
      eyebrow: '▲ FIVE-SECOND THREAT ASSESSMENT',
      line1: 'VIBE CODED.',
      line2: 'VIBE HARDENED.',
      copy: 'One command. No config. A security scanner that understands v0, Lovable, Bolt, Cursor, Claude Code, Replit Agent, Windsurf — and what each of them tends to get wrong.',
      execLabel: 'EXECUTE',
      execReady: '▶ READY',
      cmd: 'npx vibe-hardening scan',
      footnote: 'APPROVED FOR CIVILIAN USE · NOT RATED FOR PRODUCTION',
    },
    hud: {
      last24h: 'LAST 24H',
      newCrit: '● 41 NEW CRIT',
      newHigh: '● 128 NEW HIGH',
      fixed: '● 214 FIXED',
      kRepos: 'REPOS SCANNED',
      vRepos: '14,822',
      kKeys: 'KEYS LIVE',
      vKeys: '1,214',
      kScan: 'MEDIAN SCAN',
      vScan: '4.8s',
      kFail: 'FAIL RATE',
      vFail: '64%',
      fingerprintTitle: 'FINGERPRINT SUPPORT',
    },
    terminal: {
      liveFeed: '[ LIVE FEED ]',
      demo: 'RE-RUNS EVERY 6s · DEMO REPO',
      verdictLabel: 'VERDICT',
      shipQ: 'SHIP?',
      shipA: '▲ NO',
      tagTop: 'Your repo',
      tagBottom: 'might look the same.',
      headLabel: '/DEV/TTY/VH-001 · DEMO',
    },
    features: {
      label1: 'What it checks —',
      label2: '48 rules across 9 categories.',
      items: [
        {
          code: 'SEC-01',
          title: 'AI-aware rules',
          body: "Hand-tuned for v0 exports, Cursor loops, Lovable scaffolds, Bolt scaffolds, and Claude Code diffs. Knows what each tends to miss — and won't complain about what they get right.",
        },
        {
          code: 'AUT-02',
          title: 'Platform fingerprint',
          body: 'Detects Next.js, Supabase, tRPC, Prisma, Drizzle, Convex, Vercel, Netlify. Runs only the rules that apply to your stack, so scans stay under 5 seconds on average repos.',
        },
        {
          code: 'KEY-03',
          title: 'Live secret verification',
          body: 'Finds candidate keys in your git history, probes their provider endpoints, and tells you which ones are still live. Not a grep — a phone call.',
        },
      ],
    },
    quotes: [
      {
        q: '"Ran it on a client project after a Cursor session. Six criticals. Fixed before the demo call."',
        a: 'indie dev, berlin',
      },
      {
        q: '"The only scanner that understands NEXT_PUBLIC_* is a liability, not a feature."',
        a: 'security eng, sf',
      },
      {
        q: '"It flagged a hallucinated package my agent installed. I did not know that was a category."',
        a: 'founder, taipei',
      },
    ],
    pricing: {
      freeTag: 'CLI · MIT',
      freeTitle: 'Free, forever.',
      freeBody:
        'Scan any repo. Unlimited runs. Runs locally, data never leaves your machine.',
      proTag: 'PRO · TEAM SAAS',
      proTitle: 'Per-commit, per-deploy.',
      proBody:
        'Dashboard, GitHub checks, Slack alerts on new criticals, scheduled rescans. $29 / project / mo.',
      proCta: 'Join waitlist →',
    },
    waitlist: {
      title1: 'SHIP',
      title2: 'HARDENED.',
      subtitleA: 'One email on launch day, ',
      subtitleHighlight: '2026-05-13, 14:00 UTC',
      subtitleB: '. No marketing.',
      placeholder: 'you@domain.com',
      submit: 'SUBSCRIBE →',
    },
    footer: {
      brandCopy: '© 2026 · MIT · REV 0.0.12',
      colProductTitle: 'PRODUCT',
      colProductItems: ['CLI', 'Dashboard (soon)', 'GitHub App (soon)'],
      colSourceTitle: 'SOURCE',
      colSourceItems: [
        { label: 'GitHub ↗', href: 'https://github.com/vibe-hardening/cli' },
        { label: 'npm ↗', href: 'https://www.npmjs.com/package/vibe-hardening' },
        { label: 'Marketplace ↗', href: 'https://github.com/marketplace/actions/vibe-hardening' },
        { label: 'RSS ↗', href: '#' },
      ],
      colStatusTitle: 'STATUS',
      colStatusItems: ['EXPERIMENTAL', 'EN · 中文', 'VIBE-HARDENING.IO'],
      ruleDomains:
        'RULE DOMAINS · SEC secrets · AUT auth · KEY liveness · NET network · SQL injection · DEP deps · LLM prompts · INF infra',
      tagline: '"Vibe coded. Vibe hardened."',
    },
  },
  zh: {
    title: 'vibe-hardening｜AI 生成程式碼的一鍵資安掃描工具',
    classbar: {
      unit: '▲ VH-001 · 獻給 VIBE CODER ·',
      rev: 'REV 0.0.12 · CHAN 12',
      geo: 'LAT 25.03°N · LNG 121.56°E',
      date: '▲ 2026-04-20 ▲',
    },
    nav: {
      source: '原始碼 ↗',
      docs: '文件',
      waitlist: '候補名單',
      langOther: 'EN',
      langOtherHref: '/',
    },
    hero: {
      eyebrow: '▲ 五秒資安威脅評估',
      line1: 'VIBE CODED.',
      line2: 'VIBE HARDENED.',
      copy: '一個指令，零設定。這是一套懂 v0、Lovable、Bolt、Cursor、Claude Code、Replit Agent、Windsurf 的資安掃描工具，知道它們各自最常漏掉什麼。',
      execLabel: '執行',
      execReady: '▶ READY',
      cmd: 'npx vibe-hardening scan',
      footnote: '可供一般民用 · 不建議用於正式環境',
    },
    hud: {
      last24h: '過去 24H',
      newCrit: '● 41 新增 CRIT',
      newHigh: '● 128 新增 HIGH',
      fixed: '● 214 已修復',
      kRepos: '掃描數',
      vRepos: '14,822',
      kKeys: '活躍密鑰',
      vKeys: '1,214',
      kScan: '中位耗時',
      vScan: '4.8s',
      kFail: '不及格率',
      vFail: '64%',
      fingerprintTitle: '支援的平台指紋',
    },
    terminal: {
      liveFeed: '[ LIVE FEED ]',
      demo: '每 6 秒重跑 · 範例專案',
      verdictLabel: '判決',
      shipQ: '可上線？',
      shipA: '▲ 不行',
      tagTop: '你的 repo',
      tagBottom: '很可能也長這樣。',
      headLabel: '/DEV/TTY/VH-001 · DEMO',
    },
    features: {
      label1: '我們檢查什麼 —',
      label2: '9 類別共 48 條規則。',
      items: [
        {
          code: 'SEC-01',
          title: 'AI 專屬規則庫',
          body: '針對 v0 匯出、Cursor 循環、Lovable scaffold、Bolt 骨架、Claude Code diff 手動調校過的規則。知道它們各自最常漏掉什麼，也不會挑它們做對的事。',
        },
        {
          code: 'AUT-02',
          title: '平台指紋辨識',
          body: '偵測 Next.js、Supabase、tRPC、Prisma、Drizzle、Convex、Vercel、Netlify，只跑適用於你堆疊的規則，一般專案可在 5 秒內掃完。',
        },
        {
          code: 'KEY-03',
          title: '密鑰即時驗證',
          body: '在 git 歷史裡找出候選密鑰，打去上游 provider 驗證，告訴你哪些還活著。不是 grep — 是一通電話。',
        },
      ],
    },
    quotes: [
      {
        q: '「在 Cursor 寫完客戶專案後跑了一次。六個 CRITICAL。demo 前全修完。」',
        a: '獨立開發者，柏林',
      },
      {
        q: '「唯一一套真的把 NEXT_PUBLIC_* 當成風險而不是功能的掃描器。」',
        a: '資安工程師，舊金山',
      },
      {
        q: '「它抓出 agent 幫我裝的幻覺套件。我以前不知道這種分類存在。」',
        a: '創辦人，台北',
      },
    ],
    pricing: {
      freeTag: 'CLI · MIT',
      freeTitle: '永久免費。',
      freeBody: '任何 repo 都可掃，不限次數，全程在本機執行，資料不外流。',
      proTag: 'PRO · 團隊版',
      proTitle: '每次 commit，每次 deploy。',
      proBody:
        '儀表板、GitHub checks、Slack 新增 CRIT 通知、排程重掃。$29 / 專案 / 月。',
      proCta: '加入候補 →',
    },
    waitlist: {
      title1: 'SHIP',
      title2: 'HARDENED.',
      subtitleA: '上線當天寄一封信，',
      subtitleHighlight: '2026-05-13，14:00 UTC',
      subtitleB: '。沒有行銷。',
      placeholder: 'you@domain.com',
      submit: '訂閱 →',
    },
    footer: {
      brandCopy: '© 2026 · MIT · REV 0.0.12',
      colProductTitle: '產品',
      colProductItems: ['CLI', '儀表板（即將推出）', 'GitHub App（即將推出）'],
      colSourceTitle: '原始碼',
      colSourceItems: [
        { label: 'GitHub ↗', href: 'https://github.com/vibe-hardening/cli' },
        { label: 'npm ↗', href: 'https://www.npmjs.com/package/vibe-hardening' },
        { label: 'Marketplace ↗', href: 'https://github.com/marketplace/actions/vibe-hardening' },
        { label: 'RSS ↗', href: '#' },
      ],
      colStatusTitle: '狀態',
      colStatusItems: ['實驗性', 'EN · 中文', 'VIBE-HARDENING.IO'],
      ruleDomains:
        '規則領域 · SEC 密鑰 · AUT 認證 · KEY 驗證 · NET 網路 · SQL 注入 · DEP 依賴 · LLM prompt · INF 基礎設施',
      tagline: '"Vibe coded. Vibe hardened."',
    },
  },
};
