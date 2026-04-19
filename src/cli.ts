import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { runScanCommand } from './commands/scan.js';
import type { Severity } from './core/types.js';

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

  program
    .command('scan', { isDefault: true })
    .description('Scan a directory for AI-coded security issues')
    .argument('[cwd]', 'directory to scan', '.')
    .option('-f, --format <format>', 'output format: console | json', 'console')
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
    .action(
      async (
        cwd: string,
        cmdOpts: {
          format: string;
          output?: string;
          severity: string;
          offline: boolean;
        },
      ) => {
        const code = await runScanCommand({
          cwd: resolve(cwd),
          format: cmdOpts.format as 'console' | 'json',
          output: cmdOpts.output,
          severity: cmdOpts.severity as Severity,
          offline: !!cmdOpts.offline,
          version,
        });
        process.exit(code);
      },
    );

  return program;
}

export async function main(argv: string[]): Promise<number> {
  const program = buildProgram();
  await program.parseAsync(argv);
  return 0;
}
