import { describe, it, expect } from 'vitest';
import type { FileContext } from '../src/core/types.js';
import { detectPlatform } from '../src/detectors/platform.js';

function f(path: string, content = ''): FileContext {
  return { path, content };
}

describe('platform fingerprint', () => {
  it('detects cursor via .cursor/ dir + .cursorrules', () => {
    const r = detectPlatform([
      f('.cursor/rules/foo.mdc', ''),
      f('.cursorrules', ''),
      f('src/index.ts', ''),
    ]);
    expect(r.platform).toBe('cursor');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('detects claude-code via CLAUDE.md + .claude/', () => {
    const r = detectPlatform([
      f('CLAUDE.md', '# Project instructions'),
      f('.claude/settings.json', '{}'),
    ]);
    expect(r.platform).toBe('claude-code');
  });

  it('detects bolt via .bolt/ + stackblitz config', () => {
    const r = detectPlatform([
      f('.bolt/prompt', 'test'),
      f('stackblitz.config.json', '{}'),
    ]);
    expect(r.platform).toBe('bolt');
  });

  it('detects bolt via index.html generator meta', () => {
    const r = detectPlatform([
      f(
        'index.html',
        '<meta name="generator" content="bolt.new" />',
      ),
    ]);
    expect(r.platform).toBe('bolt');
  });

  it('detects lovable via package.json name', () => {
    const r = detectPlatform([
      f(
        'package.json',
        JSON.stringify({
          name: 'vite_react_shadcn_ts',
          dependencies: { react: '19' },
        }),
      ),
    ]);
    expect(r.platform).toBe('lovable');
  });

  it('detects replit via .replit', () => {
    const r = detectPlatform([
      f('.replit', 'run = "npm start"'),
      f('replit.nix', ''),
    ]);
    expect(r.platform).toBe('replit-agent');
  });

  it('detects windsurf via .windsurfrules', () => {
    const r = detectPlatform([f('.windsurfrules', ''), f('.windsurf/x', '')]);
    expect(r.platform).toBe('windsurf');
  });

  it('detects devin via .devin/ dir', () => {
    const r = detectPlatform([f('.devin/run.log', ''), f('devin.yaml', '')]);
    expect(r.platform).toBe('devin');
  });

  it('detects v0 via shadcn/ui components + v0 watermark', () => {
    const r = detectPlatform([
      f(
        'package.json',
        JSON.stringify({
          dependencies: {
            '@radix-ui/react-dialog': '1',
            'tailwindcss-animate': '1',
            'lucide-react': '1',
          },
        }),
      ),
      f('components/ui/button.tsx', '// v0 by Vercel\nexport const Button = () => null;'),
      f('components/ui/card.tsx', ''),
      f('components/ui/dialog.tsx', ''),
    ]);
    expect(r.platform).toBe('v0');
  });

  it('returns unknown when no strong signals', () => {
    const r = detectPlatform([
      f('README.md', 'hello world'),
      f('src/index.ts', 'console.log(1);'),
    ]);
    expect(r.platform).toBe('unknown');
  });

  it('returns secondary platforms when signals overlap', () => {
    const r = detectPlatform([
      f('.cursor/rules/a.mdc', ''),
      f('.windsurfrules', ''),
    ]);
    expect(['cursor', 'windsurf']).toContain(r.platform);
    expect(r.secondary.length).toBeGreaterThan(0);
  });
});
