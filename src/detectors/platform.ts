import type { FileContext, PlatformId } from '../core/types.js';

export interface PlatformSignal {
  source: string;
  weight: number;
  reason: string;
}

export interface PlatformFingerprint {
  platform: PlatformId;
  confidence: number;
  signals: PlatformSignal[];
  secondary: Array<{ platform: PlatformId; confidence: number }>;
}

interface FingerprintResult {
  platform: PlatformId;
  signals: PlatformSignal[];
}

const MAX_POSSIBLE_PER_PLATFORM = 25;
const CONFIDENCE_THRESHOLD = 0.3;

function getFile(files: FileContext[], path: string): FileContext | undefined {
  return files.find((f) => f.path === path);
}

function hasDir(files: FileContext[], prefix: string): boolean {
  return files.some((f) => f.path.startsWith(prefix));
}

function matchesGlob(files: FileContext[], pattern: RegExp): FileContext[] {
  return files.filter((f) => pattern.test(f.path));
}

function getPackageJson(files: FileContext[]): {
  deps: Record<string, string>;
  name?: string;
  scripts?: Record<string, string>;
} | null {
  const pkg = files.find(
    (f) => f.path === 'package.json' || f.path.endsWith('/package.json'),
  );
  if (!pkg) return null;
  try {
    const json = JSON.parse(pkg.content) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    return {
      deps: { ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) },
      name: json.name,
      scripts: json.scripts ?? {},
    };
  } catch {
    return null;
  }
}

/* ─── Per-platform detectors ──────────────────────────────────── */

function detectCursor(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (hasDir(files, '.cursor/'))
    s.push({ source: '.cursor/', weight: 10, reason: '.cursor/ directory' });
  if (getFile(files, '.cursorrules'))
    s.push({
      source: '.cursorrules',
      weight: 10,
      reason: 'legacy .cursorrules',
    });
  if (hasDir(files, '.cursor/rules/'))
    s.push({
      source: '.cursor/rules/',
      weight: 10,
      reason: 'MDC rules directory',
    });
  if (getFile(files, '.cursorindexingignore'))
    s.push({
      source: '.cursorindexingignore',
      weight: 4,
      reason: 'cursor indexing config',
    });
  return s;
}

function detectClaudeCode(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (getFile(files, 'CLAUDE.md'))
    s.push({ source: 'CLAUDE.md', weight: 10, reason: 'top-level CLAUDE.md' });
  if (hasDir(files, '.claude/'))
    s.push({ source: '.claude/', weight: 10, reason: '.claude/ directory' });
  if (getFile(files, '.mcp.json'))
    s.push({ source: '.mcp.json', weight: 4, reason: 'MCP config' });
  return s;
}

function detectBolt(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (hasDir(files, '.bolt/'))
    s.push({ source: '.bolt/', weight: 10, reason: '.bolt/ directory' });
  if (getFile(files, 'stackblitz.config.json'))
    s.push({
      source: 'stackblitz.config.json',
      weight: 6,
      reason: 'stackblitz config',
    });
  const indexHtml = getFile(files, 'index.html');
  if (indexHtml && /generator.*bolt\.new/i.test(indexHtml.content))
    s.push({
      source: 'index.html',
      weight: 9,
      reason: 'bolt.new generator meta',
    });
  return s;
}

function detectLovable(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (hasDir(files, '.lovable/'))
    s.push({
      source: '.lovable/',
      weight: 10,
      reason: '.lovable/ directory',
    });
  const pkg = getPackageJson(files);
  if (pkg?.name === 'vite_react_shadcn_ts')
    s.push({
      source: 'package.json',
      weight: 8,
      reason: 'Lovable default package name',
    });
  const readme = getFile(files, 'README.md');
  if (readme && /lovable\.dev/i.test(readme.content))
    s.push({
      source: 'README.md',
      weight: 10,
      reason: 'README mentions lovable.dev',
    });
  return s;
}

function detectReplit(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (getFile(files, '.replit'))
    s.push({ source: '.replit', weight: 10, reason: '.replit config' });
  if (getFile(files, 'replit.nix'))
    s.push({ source: 'replit.nix', weight: 6, reason: 'replit nix deps' });
  const readme = getFile(files, 'README.md');
  if (readme && /built on replit|made on replit/i.test(readme.content))
    s.push({
      source: 'README.md',
      weight: 6,
      reason: 'README mentions Replit',
    });
  return s;
}

function detectWindsurf(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (hasDir(files, '.windsurf/'))
    s.push({
      source: '.windsurf/',
      weight: 10,
      reason: '.windsurf/ directory',
    });
  if (getFile(files, '.windsurfrules'))
    s.push({
      source: '.windsurfrules',
      weight: 10,
      reason: 'windsurf rules file',
    });
  if (hasDir(files, '.codeium/'))
    s.push({ source: '.codeium/', weight: 3, reason: 'codeium directory' });
  return s;
}

function detectDevin(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  if (hasDir(files, '.devin/'))
    s.push({ source: '.devin/', weight: 10, reason: '.devin/ directory' });
  if (getFile(files, 'devin.yaml'))
    s.push({ source: 'devin.yaml', weight: 5, reason: 'devin.yaml config' });
  return s;
}

function detectV0(files: FileContext[]): PlatformSignal[] {
  const s: PlatformSignal[] = [];
  const pkg = getPackageJson(files);
  if (pkg) {
    const radix = Object.keys(pkg.deps).some((d) =>
      d.startsWith('@radix-ui/'),
    );
    const tailwindAnimate = 'tailwindcss-animate' in pkg.deps;
    const lucide = 'lucide-react' in pkg.deps;
    if (radix && tailwindAnimate && lucide)
      s.push({
        source: 'package.json',
        weight: 5,
        reason: 'radix + tailwind-animate + lucide trio',
      });
  }
  const uiFiles = matchesGlob(files, /(^|\/)components\/ui\/[^/]+\.(tsx|jsx)$/);
  if (uiFiles.length >= 3)
    s.push({
      source: 'components/ui/',
      weight: 6,
      reason: `${uiFiles.length} shadcn/ui components`,
    });
  for (const f of uiFiles.slice(0, 3)) {
    if (/\/\/\s*v0\s+by\s+vercel/i.test(f.content)) {
      s.push({
        source: f.path,
        weight: 10,
        reason: '`// v0 by Vercel` comment',
      });
      break;
    }
  }
  return s;
}

/* ─── Main ────────────────────────────────────────────────────── */

const DETECTORS: Array<{
  platform: PlatformId;
  fn: (files: FileContext[]) => PlatformSignal[];
}> = [
  { platform: 'v0', fn: detectV0 },
  { platform: 'lovable', fn: detectLovable },
  { platform: 'bolt', fn: detectBolt },
  { platform: 'cursor', fn: detectCursor },
  { platform: 'claude-code', fn: detectClaudeCode },
  { platform: 'replit-agent', fn: detectReplit },
  { platform: 'windsurf', fn: detectWindsurf },
  { platform: 'devin', fn: detectDevin },
];

export function detectPlatform(files: FileContext[]): PlatformFingerprint {
  const results: FingerprintResult[] = DETECTORS.map((d) => ({
    platform: d.platform,
    signals: d.fn(files),
  }));

  const ranked = results
    .map((r) => ({
      platform: r.platform,
      score: r.signals.reduce((sum, s) => sum + s.weight, 0),
      signals: r.signals,
    }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const confidence = winner
    ? Math.min(winner.score / MAX_POSSIBLE_PER_PLATFORM, 1)
    : 0;

  return {
    platform:
      winner && confidence >= CONFIDENCE_THRESHOLD
        ? winner.platform
        : 'unknown',
    confidence,
    signals: winner?.signals ?? [],
    secondary: ranked.slice(1, 3).map((r) => ({
      platform: r.platform,
      confidence: Math.min(r.score / MAX_POSSIBLE_PER_PLATFORM, 1),
    })),
  };
}
