import { readFile, stat } from 'node:fs/promises';
import { dirname, basename } from 'node:path';
import fg from 'fast-glob';
import { parseSkillMdContent } from '../parsers/skill-md.js';
import type { AgentDetected, AgentFinding } from '../types.js';

/**
 * Rule D — SKILL.md schema + body integrity checks.
 *
 * Some sub-rules redirect to other rule packs:
 *   - D02 ("injection in description") is fully covered by rule B,
 *     which already scans `frontmatter.description`. No duplicate.
 *   - D04 ("dangerous shell in scripts") is fully covered by rule C,
 *     which already scans the `scripts/` subdirectory. No duplicate.
 *
 * What rule D actually adds:
 *   D01  missing required fields (name / description)
 *   D03  scripts/ exists but SKILL.md body never references it
 *   D05  body mentions sensitive path + a network exfil verb nearby
 *   D06  body lists 5+ env vars (env-dump pattern)
 *   D07  skill folder name typosquats a popular skill (Levenshtein ≤ 2)
 */

export interface RuleDResult {
  findings: AgentFinding[];
  filesScanned: number;
}

/**
 * Tiny known-skill seed list for v1 typosquat detection (D07). The
 * list is intentionally minimal — we'd rather miss than false-positive
 * the user's own legitimate skills. Post-launch, telemetry tells us
 * which skill names are most common across users and we expand this.
 */
const POPULAR_SKILL_NAMES = new Set<string>([
  'git-commit',
  'git-push',
  'pr-review',
  'code-review',
  'test-runner',
  'deploy',
  'lint',
  'format',
  'docs',
  'changelog',
  'security-review',
  'refactor',
]);

/** Network verbs that indicate exfiltration when paired with a
 *  sensitive path reference (D05). */
const EXFIL_VERBS_RE =
  /\b(?:curl|wget|fetch\s*\(|axios|http\.post|requests\.(?:post|put)|fetch\s*`)/i;

/** Sensitive credential paths to flag for D05. */
const SENSITIVE_PATH_RE =
  /(?:~|\$HOME|\${HOME})[/\\]\.(?:ssh|aws|gnupg|config[/\\](?:gh|gcloud|kube))[/\\]|\.env(?:\b|$|[/\\])/g;

/** Env-dump pattern for D06. Matches both shell-style (\${VAR}) and
 *  JS-style (process.env.VAR). 5+ DISTINCT vars in same skill = fire. */
const ENV_VAR_RE =
  /(?:process\.env\.([A-Z_][A-Z0-9_]{2,})|\$\{?([A-Z_][A-Z0-9_]{2,})\}?)/g;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1, // delete
        (curr[j - 1] ?? 0) + 1, // insert
        (prev[j - 1] ?? 0) + cost, // substitute
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function applyRuleD(
  agents: AgentDetected[],
): Promise<RuleDResult> {
  const findings: AgentFinding[] = [];
  let filesScanned = 0;

  for (const agent of agents) {
    if (!agent.skillsPath) continue;
    const skillFiles = await fg(['**/SKILL.md'], {
      cwd: agent.skillsPath,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });

    const BATCH = 10;
    for (let i = 0; i < skillFiles.length; i += BATCH) {
      const slice = skillFiles.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map(async (path) => {
          const content = await readFile(path, 'utf8');
          return { path, content };
        }),
      );

      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        filesScanned++;
        const { path, content } = r.value;
        const parsed = parseSkillMdContent(path, content);
        const skillDir = dirname(path);

        // D01 — missing required fields
        const fm = parsed.frontmatter;
        const missingName = !fm || typeof fm.name !== 'string' || !fm.name.trim();
        const missingDesc =
          !fm ||
          typeof fm.description !== 'string' ||
          !fm.description.trim();
        if (missingName || missingDesc) {
          const which = [
            missingName && 'name',
            missingDesc && 'description',
          ]
            .filter(Boolean)
            .join(' + ');
          findings.push({
            ruleId: 'vh-agent-d01',
            severity: 'low',
            category: 'skill-schema',
            file: path,
            line: 1,
            column: 1,
            snippet: parsed.hasFrontmatter
              ? '<frontmatter present>'
              : '<no frontmatter>',
            message: `SKILL.md missing required field(s): ${which}`,
            fixHint:
              'Per the SKILL.md format spec, both `name` and `description` are required for an agent to load the skill. Add them at the top of the frontmatter.',
          });
        }

        // D03 — scripts/ directory exists but body never references it
        const scriptsDir = `${skillDir}/scripts`;
        const hasScriptsDir =
          (await pathExists(scriptsDir)) || (await pathExists(`${skillDir}\\scripts`));
        if (hasScriptsDir) {
          const bodyLower = parsed.body.toLowerCase();
          const mentionsScripts =
            bodyLower.includes('scripts/') ||
            bodyLower.includes('scripts\\') ||
            bodyLower.includes('script ') ||
            bodyLower.includes('executable') ||
            bodyLower.includes('run ') ||
            bodyLower.includes('execute');
          if (!mentionsScripts) {
            findings.push({
              ruleId: 'vh-agent-d03',
              severity: 'medium',
              category: 'skill-schema',
              file: path,
              line: parsed.bodyStartLine,
              column: 1,
              snippet: '<scripts/ dir present, not mentioned in body>',
              message:
                'Skill bundles a scripts/ directory but the SKILL.md body never references it — possible hidden capability',
              fixHint:
                'If the agent is meant to invoke these scripts, document them in the body so users understand what gets executed. If they are leftover artifacts, delete them.',
            });
          }
        }

        // D05 — sensitive path + nearby exfil verb
        SENSITIVE_PATH_RE.lastIndex = 0;
        let pathMatch: RegExpExecArray | null;
        while ((pathMatch = SENSITIVE_PATH_RE.exec(parsed.body)) !== null) {
          const idx = pathMatch.index;
          // 200-char window on either side
          const window = parsed.body.slice(
            Math.max(0, idx - 200),
            Math.min(parsed.body.length, idx + 200),
          );
          if (EXFIL_VERBS_RE.test(window)) {
            const before = parsed.body.slice(0, idx);
            const lineNum =
              parsed.bodyStartLine +
              (before.match(/\r?\n/g) ?? []).length;
            findings.push({
              ruleId: 'vh-agent-d05',
              severity: 'high',
              category: 'skill-schema',
              file: path,
              line: lineNum,
              column: 1,
              snippet: pathMatch[0],
              message:
                'Skill body references a credential path together with a network call — possible exfiltration pattern',
              fixHint:
                'Skill instructs the agent to read sensitive files and send them over the network. Treat as malicious unless you authored this skill.',
            });
            break; // one D05 per file is enough — keep noise down
          }
        }

        // D06 — 5+ distinct env vars in body (env-dump signal)
        ENV_VAR_RE.lastIndex = 0;
        const envVars = new Set<string>();
        let envMatch: RegExpExecArray | null;
        while ((envMatch = ENV_VAR_RE.exec(parsed.body)) !== null) {
          const v = envMatch[1] ?? envMatch[2] ?? '';
          if (v) envVars.add(v);
        }
        if (envVars.size >= 5) {
          findings.push({
            ruleId: 'vh-agent-d06',
            severity: 'medium',
            category: 'skill-schema',
            file: path,
            line: parsed.bodyStartLine,
            column: 1,
            snippet: `${envVars.size} env vars referenced`,
            message: `SKILL.md body references ${envVars.size} distinct env vars — possible env-dump pattern`,
            fixHint:
              'Skills enumerating many env vars are commonly used to read secrets at runtime. Confirm the skill needs each one; remove the rest.',
          });
        }

        // D07 — skill dir name typosquat
        const skillName = basename(skillDir);
        if (
          skillName.length >= 4 &&
          !POPULAR_SKILL_NAMES.has(skillName)
        ) {
          for (const popular of POPULAR_SKILL_NAMES) {
            const dist = levenshtein(skillName, popular);
            if (dist > 0 && dist <= 2) {
              findings.push({
                ruleId: 'vh-agent-d07',
                severity: 'medium',
                category: 'skill-schema',
                file: path,
                line: 1,
                column: 1,
                snippet: `${skillName} (≈ ${popular})`,
                message: `Skill folder name "${skillName}" is suspiciously close to popular skill "${popular}" (Levenshtein ${dist})`,
                fixHint:
                  'Typosquatting popular skill names is a known supply-chain attack pattern. Verify this skill came from a trusted source.',
              });
              break;
            }
          }
        }
      }
    }
  }

  return { findings, filesScanned };
}
