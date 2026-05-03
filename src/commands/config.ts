import { randomUUID } from 'node:crypto';
import pc from 'picocolors';
import {
  CONSENT_VERSION,
  getConfigDir,
  getConfigPath,
  loadConfig,
  saveConfig,
  isUniversallyOptedOut,
} from '../core/telemetry.js';

/**
 * `vh config` is intentionally a tiny subcommand — only telemetry is
 * configurable today. The rest of the CLI's behaviour comes from
 * command-line flags so configuration drift between runs is impossible
 * to introduce by accident.
 */

type ConfigAction =
  | { kind: 'show' }
  | { kind: 'get'; key: string }
  | { kind: 'set'; key: string; value: string };

const KNOWN_KEYS = new Set(['telemetry']);

export async function runConfigCommand(action: ConfigAction): Promise<number> {
  if (action.kind === 'show') {
    const config = await loadConfig();
    process.stdout.write(`${pc.bold('vibe-hardening config')}\n`);
    if (!config) {
      process.stdout.write(
        pc.dim(
          '  no config yet — first interactive scan will prompt for telemetry consent.\n',
        ),
      );
    } else {
      process.stdout.write(
        `  telemetry:        ${config.enabled ? pc.green('on') : pc.red('off')}\n`,
      );
      process.stdout.write(
        `  anonymous_id:     ${pc.dim(config.anonymousId)}\n`,
      );
      process.stdout.write(
        `  consent_version:  ${pc.dim(String(config.consentVersion))}\n`,
      );
      process.stdout.write(
        `  first_seen:       ${pc.dim(config.firstSeen)}\n`,
      );
    }
    process.stdout.write(`  config dir:       ${pc.dim(getConfigDir())}\n`);
    process.stdout.write(`  config file:      ${pc.dim(getConfigPath())}\n`);
    if (isUniversallyOptedOut()) {
      process.stdout.write(
        `  ${pc.yellow(
          'note',
        )}: telemetry is force-disabled by environment ` +
          `(DO_NOT_TRACK / CI / VH_TELEMETRY).\n`,
      );
    }
    return 0;
  }

  if (action.kind === 'get') {
    if (!KNOWN_KEYS.has(action.key)) {
      process.stderr.write(
        pc.red(`error: unknown config key "${action.key}". `) +
          pc.dim('known keys: telemetry\n'),
      );
      return 2;
    }
    const config = await loadConfig();
    process.stdout.write((config?.enabled ? 'on' : 'off') + '\n');
    return 0;
  }

  if (action.kind === 'set') {
    if (!KNOWN_KEYS.has(action.key)) {
      process.stderr.write(
        pc.red(`error: unknown config key "${action.key}". `) +
          pc.dim('known keys: telemetry\n'),
      );
      return 2;
    }
    const v = action.value.toLowerCase();
    if (v !== 'on' && v !== 'off') {
      process.stderr.write(
        pc.red(`error: expected "on" or "off", got "${action.value}".\n`),
      );
      return 2;
    }
    const existing = await loadConfig();
    const config = {
      enabled: v === 'on',
      // ?? not || — preserve fields like consentVersion=0 from a
      // hypothetical future migration. Today both work, but `??`
      // matches the actual intent ("only fall back when missing").
      anonymousId: existing?.anonymousId ?? randomUUID(),
      consentVersion: existing?.consentVersion ?? CONSENT_VERSION,
      firstSeen: existing?.firstSeen ?? new Date().toISOString(),
    };
    try {
      await saveConfig(config);
    } catch (err) {
      process.stderr.write(
        pc.red(
          `error: could not write config to ${getConfigPath()}: ${
            err instanceof Error ? err.message : 'unknown'
          }\n`,
        ),
      );
      return 2;
    }
    process.stdout.write(
      `${pc.green('✓')} telemetry ${v === 'on' ? pc.green('on') : pc.red('off')}\n`,
    );
    if (v === 'on' && isUniversallyOptedOut()) {
      process.stdout.write(
        pc.yellow(
          '  note: telemetry is force-disabled by environment ' +
            '(DO_NOT_TRACK / CI / VH_TELEMETRY); ' +
            'config will only take effect outside that env.\n',
        ),
      );
    }
    return 0;
  }

  // Exhaustiveness check — should be unreachable.
  const _exhaustive: never = action;
  void _exhaustive;
  return 0;
}
