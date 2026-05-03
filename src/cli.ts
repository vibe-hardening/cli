import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { runScanCommand } from './commands/scan.js';
import { runExplainCommand } from './commands/explain.js';
import { runConfigCommand } from './commands/config.js';
import type { Severity } from './core/types.js';
import { walk } from './core/walker.js';
import { runScan } from './core/scan.js';
import { renderBadge } from './scoring/badge.js';

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, '..', 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function buildProgram(): Command {
  const program = new Command();
  const version = readPackageVersion();

  program
    .name('vibe-hardening')
    .description('One-command security scanner for AI-generated code.')
    .version(version);

  // Branded header + examples block on `--help`. picocolors auto-
  // disables when stdout isn't a TTY, so CI logs / piped output stay
  // plain. Kept tight on purpose — the help screen is for someone
  // who already typed --help and just needs orientation, not a
  // marketing pitch.
  program
    .addHelpText(
      'beforeAll',
      [
        '',
        `  ${pc.bold(pc.red('▲'))} ${pc.bold('vibe-hardening')}  ${pc.dim(`v${version}`)}`,
        `  ${pc.dim('Vibe coded. Vibe hardened.')}  ${pc.dim('·')}  ${pc.cyan('https://vibe-hardening.io')}`,
        '',
      ].join('\n'),
    )
    .addHelpText(
      'after',
      [
        '',
        pc.bold('Examples:'),
        `  ${pc.dim('$')} npx vibe-hardening scan`,
        `  ${pc.dim('$')} npx vibe-hardening scan --suggest-fix`,
        `  ${pc.dim('$')} npx vibe-hardening scan --changed-only`,
        `  ${pc.dim('$')} npx vibe-hardening scan --format markdown -o report.md`,
        `  ${pc.dim('$')} npx vibe-hardening explain vh-secret-openai`,
        `  ${pc.dim('$')} npx vibe-hardening badge -o badge.svg`,
        `  ${pc.dim('$')} npx vibe-hardening config set telemetry off`,
        '',
        `${pc.dim('Docs:')}  ${pc.cyan('https://github.com/vibe-hardening/cli')}`,
        `${pc.dim('Marketplace:')}  ${pc.cyan('https://github.com/marketplace/actions/vibe-hardening')}`,
        '',
      ].join('\n'),
    );

  program
    .command('scan', { isDefault: true })
    .description('Scan a directory for AI-coded security issues')
    .argument('[cwd]', 'directory to scan', '.')
    .option('-f, --format <format>', 'output format: console | json | html | markdown', 'console')
    .option('-o, --output <file>', 'write output to file instead of stdout')
    .option(
      '-s, --severity <level>',
      'minimum severity to report: critical | high | medium | low | info',
      'info',
    )
    .option(
      '--offline',
      'skip network-dependent checks (OSV.dev CVE scan, npm registry lookup)',
      false,
    )
    .option(
      '--include-tests',
      'also scan test/**, *.test.*, *.spec.*, __tests__/** (off by default: test fixtures usually contain intentional bad patterns)',
      false,
    )
    .option(
      '--include-docs',
      'run injection/network/auth pattern rules on markdown too (off by default: docs describe vulnerabilities, not exhibit them)',
      false,
    )
    .option(
      '--no-gitignore',
      'ignore .gitignore entries when deciding which files to scan (by default .gitignore is respected)',
    )
    .option(
      '--verify',
      'live-check detected secrets against provider APIs (requires --own)',
      false,
    )
    .option(
      '--own',
      'confirm the detected secrets belong to you — required alongside --verify to prevent accidentally probing third-party credentials',
      false,
    )
    .option(
      '--roast',
      'dry brutalist one-liners instead of neutral rule messages (console output only — JSON / HTML remain professional for CI)',
      false,
    )
    .option(
      '--changed-only [ref]',
      'only scan files changed in git. Without a ref, diffs against HEAD (uncommitted + staged). With a ref like `main` or `origin/main`, performs a 3-dot diff (PR / CI mode). 10× faster on large repos.',
      false,
    )
    .option(
      '--suggest-fix',
      'print copy-paste-able diffs for fixable secret findings (inline literal → process.env.X). Never modifies files. Console-only.',
      false,
    )
    .option(
      '--compare <path>',
      'path to a previous scan JSON output. The report will only show NEW findings since that baseline (added) plus a delta line (`+5 new · -2 fixed · 22 unchanged`). Useful for PR review and onboarding existing repos.',
    )
    .action(
      async (
        cwd: string,
        cmdOpts: {
          format: string;
          output?: string;
          severity: string;
          offline: boolean;
          includeTests: boolean;
          includeDocs: boolean;
          gitignore: boolean;
          verify: boolean;
          own: boolean;
          roast: boolean;
          changedOnly: boolean | string;
          suggestFix: boolean;
          compare?: string;
        },
      ) => {
        const code = await runScanCommand({
          cwd: resolve(cwd),
          format: cmdOpts.format as 'console' | 'json' | 'html' | 'markdown',
          output: cmdOpts.output,
          severity: cmdOpts.severity as Severity,
          offline: !!cmdOpts.offline,
          includeTests: !!cmdOpts.includeTests,
          includeDocs: !!cmdOpts.includeDocs,
          // commander exposes --no-gitignore as gitignore:false
          respectGitignore: cmdOpts.gitignore !== false,
          verify: !!cmdOpts.verify,
          own: !!cmdOpts.own,
          roast: !!cmdOpts.roast,
          changedOnly: cmdOpts.changedOnly ?? false,
          suggestFix: !!cmdOpts.suggestFix,
          compare: cmdOpts.compare,
          version,
        });
        process.exit(code);
      },
    );

  program
    .command('explain')
    .description(
      'Print detailed docs for a rule ID (severity, what it detects, why it matters, how to fix). Run `scan` first to see rule IDs in your findings. CVE rules are enriched with live osv.dev advisory metadata when online.',
    )
    .argument('<rule-id>', 'rule ID, e.g. vh-secret-openai')
    .option(
      '--offline',
      'skip the live osv.dev advisory fetch (CVE rules only)',
      false,
    )
    .action(async (ruleId: string, cmdOpts: { offline: boolean }) => {
      const code = await runExplainCommand(ruleId, {
        offline: !!cmdOpts.offline,
      });
      // Use process.exitCode rather than process.exit() so Node has
      // a chance to drain any pending fetch sockets — calling exit()
      // mid-cleanup triggers a libuv assertion on Windows.
      process.exitCode = code;
    });

  // `config` is a tiny subcommand group — only telemetry is configurable
  // today. Everything else stays as flags so configuration drift between
  // runs is impossible to introduce by accident.
  const configCmd = program
    .command('config')
    .description(
      'Manage local config (telemetry opt-in). Stored in $XDG_CONFIG_HOME/vibe-hardening/config.json (or %APPDATA% on Windows).',
    );

  configCmd
    .command('show')
    .description('Show current config and where it lives')
    .action(async () => {
      const code = await runConfigCommand({ kind: 'show' });
      process.exitCode = code;
    });

  configCmd
    .command('get <key>')
    .description('Print a config value (e.g. `get telemetry`)')
    .action(async (key: string) => {
      const code = await runConfigCommand({ kind: 'get', key });
      process.exitCode = code;
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a config value (e.g. `set telemetry off`)')
    .action(async (key: string, value: string) => {
      const code = await runConfigCommand({ kind: 'set', key, value });
      process.exitCode = code;
    });

  program
    .command('badge')
    .description('Generate an SVG badge showing the repo security score')
    .argument('[cwd]', 'directory to scan', '.')
    .option('-o, --output <file>', 'write SVG to file (default: stdout)')
    .option('--offline', 'skip network-dependent checks', false)
    .action(
      async (
        cwd: string,
        cmdOpts: { output?: string; offline: boolean },
      ) => {
        const files = await walk({ cwd: resolve(cwd) });
        const report = await runScan({ files, offline: !!cmdOpts.offline });
        const svg = renderBadge(report.score.score, report.score.grade);
        if (cmdOpts.output) {
          const target = resolve(cmdOpts.output);
          // Create parent dir on demand so `badge -o build/a/b.svg`
          // works even when `build/a/` doesn't exist yet.
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, svg, 'utf8');
        } else {
          process.stdout.write(svg + '\n');
        }
        process.exit(0);
      },
    );

  return program;
}

export async function main(argv: string[]): Promise<number> {
  const program = buildProgram();
  await program.parseAsync(argv);
  return 0;
}
