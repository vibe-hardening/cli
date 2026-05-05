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
  commands: {
    label1: string;
    label2: string;
    items: { cmd: string; body: string }[];
  };
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
    thoughtsPlaceholder: string;
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
      rev: 'REV 0.4.0 · CHAN 25',
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
      label2: '74 code rules + 65 agent skill rules. 4 languages, 10 agent platforms.',
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
        {
          code: 'AGT-04',
          title: 'Agent skill scanner',
          body: 'New in 0.4.0. Statically scans skill files for Cursor, Claude Code, OpenClaw, Hermes, Gemini CLI, Goose, and 4 other agent platforms. Catches hardcoded keys, prompt injection, dangerous shell, MCP misconfigs — before the agent loads them.',
        },
      ],
    },
    commands: {
      label1: 'How you use it —',
      label2: '7 commands, all console-first.',
      items: [
        {
          cmd: 'vibe-hardening scan',
          body: 'Main command. Scores your repo 0–100 with A–F grade. 51 rules covering hardcoded keys, SQL injection, missing auth on routes, CORS, Supabase RLS, eval(req.body), localStorage tokens, weak bcrypt rounds, and packages LLMs hallucinate.',
        },
        {
          cmd: 'scan --changed-only [ref]',
          body: 'Scan only files in git diff. Without a ref: vs HEAD. With a ref like origin/main: 3-dot diff for PR-mode CI scans. 10× faster on large repos.',
        },
        {
          cmd: 'scan --verify --own',
          body: 'Hits each leaked key against the real provider API. 9 providers. Tells you which are still live vs. revoked. --own is a seatbelt that refuses to probe keys you have not claimed.',
        },
        {
          cmd: 'scan --suggest-fix',
          body: 'Prints copy-paste-able diffs that swap inline keys for process.env.X plus an .env.example stub. Console-only. Never modifies your files.',
        },
        {
          cmd: 'scan --roast',
          body: 'Brutalist mode. Neutral rule messages become dry one-liners. Console only — JSON / HTML output stays professional for CI artifacts.',
        },
        {
          cmd: 'vh explain <rule-id>',
          body: 'Detailed docs for any rule: severity, what it detects, why it matters, how to fix. Covers all 49 rule IDs. Docs in your terminal — no browser needed.',
        },
        {
          cmd: 'vh badge',
          body: 'Outputs an SVG you can embed in your README to show the repo current security score. Live-updating when paired with a scheduled CI run.',
        },
      ],
    },
    pricing: {
      freeTag: 'CLI · MIT',
      freeTitle: 'Free, forever.',
      freeBody:
        'Scan any repo. Unlimited runs. Your code stays on your machine — only opt-in anonymous stats (rule-IDs that fired, never paths or content).',
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
      thoughtsPlaceholder:
        'Optional — what do you want this scanner to catch? what AI tool burned you last? (we read every reply)',
    },
    footer: {
      brandCopy: '© 2026 · MIT · REV 0.4.0',
      colProductTitle: 'PRODUCT',
      colProductItems: ['CLI', 'GitHub Action', 'Score Badge'],
      colSourceTitle: 'SOURCE',
      colSourceItems: [
        { label: 'GitHub ↗', href: 'https://github.com/vibe-hardening/cli' },
        { label: 'npm ↗', href: 'https://www.npmjs.com/package/vibe-hardening' },
        { label: 'Marketplace ↗', href: 'https://github.com/marketplace/actions/vibe-hardening' },
        { label: 'Privacy', href: '/privacy' },
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
      rev: 'REV 0.4.0 · CHAN 25',
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
      label2: '74 條 code 規則 + 65 條 agent skill 規則。4 種語言、10 個 agent 平台。',
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
        {
          code: 'AGT-04',
          title: 'Agent skill 掃描器',
          body: '0.4.0 新增。靜態掃 Cursor、Claude Code、OpenClaw、Hermes、Gemini CLI、Goose 等 10 個 agent 平台的 skill 檔。抓硬編密鑰、prompt injection、危險 shell、MCP 設定異常—— 在 agent 載入之前。',
        },
      ],
    },
    commands: {
      label1: '怎麼用 —',
      label2: '七個指令，全部 terminal first。',
      items: [
        {
          cmd: 'vibe-hardening scan',
          body: '主指令。掃完給 0–100 分配 A–F 等級。51 條規則涵蓋硬寫的金鑰、SQL injection、缺驗證的路由、CORS、Supabase RLS、eval(req.body)、localStorage 存 token、bcrypt 弱 rounds、被 LLM 幻想出來的 npm 套件。',
        },
        {
          cmd: 'scan --changed-only [ref]',
          body: '只掃 git diff 變動的檔案。不加 ref 是跟 HEAD 比；加 origin/main 這種 ref 走 3-dot diff，PR 模式 CI 用。大 repo 快 10 倍。',
        },
        {
          cmd: 'scan --verify --own',
          body: '掃到的金鑰真的拿去打對應 provider API。9 家支援。告訴你還活著還是已撤銷。--own 是安全帶，沒加就拒絕去探不是你的金鑰。',
        },
        {
          cmd: 'scan --suggest-fix',
          body: '印複製貼上的 diff，把硬寫的 key 換成 process.env.X，附 .env.example 範本。只影響 console，絕對不會改你的檔案。',
        },
        {
          cmd: 'scan --roast',
          body: '毒舌模式。中性訊息換成一句話。只影響 console，JSON / HTML 產出維持專業給 CI 用。',
        },
        {
          cmd: 'vh explain <rule-id>',
          body: '每條規則的詳細說明：嚴重度、抓什麼、為什麼重要、怎麼修。49 條全覆蓋。把文件塞回 terminal，不用開瀏覽器。',
        },
        {
          cmd: 'vh badge',
          body: '吐一個 SVG 出來。貼在 README 顯示這個 repo 的安全分數。配定期 CI 跑就會自動更新。',
        },
      ],
    },
    pricing: {
      freeTag: 'CLI · MIT',
      freeTitle: '永久免費。',
      freeBody:
        '任何 repo 都可掃、不限次數，程式碼絕不離開你的機器；只有 opt-in 匿名統計（哪些規則觸發、絕不送路徑或內容）。',
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
      thoughtsPlaceholder:
        '想說什麼都可以（選填）—— 你希望這個工具能抓到什麼？哪個 AI 工具最近坑過你？我們會看每一封。',
    },
    footer: {
      brandCopy: '© 2026 · MIT · REV 0.4.0',
      colProductTitle: '產品',
      colProductItems: ['CLI', 'GitHub Action', '分數徽章'],
      colSourceTitle: '原始碼',
      colSourceItems: [
        { label: 'GitHub ↗', href: 'https://github.com/vibe-hardening/cli' },
        { label: 'npm ↗', href: 'https://www.npmjs.com/package/vibe-hardening' },
        { label: 'Marketplace ↗', href: 'https://github.com/marketplace/actions/vibe-hardening' },
        { label: '隱私政策', href: '/zh/privacy' },
      ],
      colStatusTitle: '狀態',
      colStatusItems: ['實驗性', 'EN · 中文', 'VIBE-HARDENING.IO'],
      ruleDomains:
        '規則領域 · SEC 密鑰 · AUT 認證 · KEY 驗證 · NET 網路 · SQL 注入 · DEP 依賴 · LLM prompt · INF 基礎設施',
      tagline: '"Vibe coded. Vibe hardened."',
    },
  },
};
