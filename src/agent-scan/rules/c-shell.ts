import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fg from 'fast-glob';
import { parseSkillMdContent } from '../parsers/skill-md.js';
import type { AgentDetected, AgentFinding } from '../types.js';

/**
 * Rule C — Dangerous shell commands embedded in skill body or scripts.
 *
 * Two surfaces:
 *   1. SKILL.md body — agent reads this and may execute commands
 *      verbatim if the user asks
 *   2. scripts/ subdirectory — actual executable files the agent can
 *      invoke directly
 *
 * Severity is HIGH for all 14 patterns. We don't downgrade based on
 * fenced-code-block context (a `rm -rf /` inside ``` ``` is still
 * `rm -rf /` if the agent quotes it back). Users can `--exclude C0X`
 * if a specific rule produces false positives in their corpus.
 */

interface CPattern {
  id: string;
  regex: RegExp;
  description: string;
}

const C_PATTERNS: CPattern[] = [
  {
    id: 'C01',
    regex: /\brm\s+-[rRf]+\s+\/(?:\s|$)/g,
    description: '`rm -rf /` — wipe filesystem',
  },
  {
    id: 'C02',
    regex: /\bcurl\s+[^\n|]+\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/g,
    description: '`curl | sh` — pipe remote script to shell',
  },
  {
    id: 'C03',
    regex: /\bwget\s+[^\n|]+\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/g,
    description: '`wget | sh` — pipe remote script to shell',
  },
  {
    id: 'C04',
    regex: /\beval\s*\(?\s*\$\{?\w+\}?\)?/g,
    description: '`eval $var` — eval user-controlled variable',
  },
  {
    id: 'C05',
    regex: /\bexec\s+\$\{?\w+\}?/g,
    description: '`exec $var` — exec user-controlled variable',
  },
  {
    id: 'C06',
    regex: /\bchmod\s+(?:777|\+x\s+\/tmp\/)/g,
    description: '`chmod 777` or `chmod +x /tmp/` — privilege escalation',
  },
  {
    id: 'C07',
    regex: /\bsudo\s+(?:rm|chmod|chown|cp|mv|cat|tee|dd|nc|curl|wget|sh|bash|zsh|python|node)\b/g,
    description: '`sudo` invoking a sensitive command',
  },
  {
    id: 'C08',
    regex: /\bnc\s+(?:-l\s+-p\b|-e\s+\/bin\/)/g,
    description: '`nc` listener / `nc -e /bin/sh` — netcat backdoor',
  },
  {
    id: 'C09',
    regex: /(?:>|>>)\s*\/etc\/(?:passwd|shadow|sudoers|hosts)\b/g,
    description: 'redirect into critical system file',
  },
  {
    id: 'C10',
    regex:
      /(?:>|>>)\s*~?\/?\.(?:ssh\/authorized_keys|bashrc|zshrc|profile|bash_profile)\b/g,
    description: 'redirect into shell rc / authorized_keys (persistence)',
  },
  {
    id: 'C11',
    regex: /\bdd\s+if=\/dev\/(?:zero|random)\s+of=\/dev\/[sh]d/g,
    description: '`dd if=/dev/zero of=/dev/sd*` — wipe block device',
  },
  {
    id: 'C12',
    regex: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/g,
    description: 'fork bomb',
  },
  {
    id: 'C13',
    regex: /\bbase64\s+-d\s*\|\s*(?:sh|bash|zsh)\b/g,
    description: '`base64 -d | sh` — decode + exec opaque payload',
  },
  {
    id: 'C14',
    regex: /\bpython\s+-c\s+["']?\s*exec\s*\(/g,
    description: '`python -c "exec(…)"` — python eval',
  },
];

export interface RuleCResult {
  findings: AgentFinding[];
  filesScanned: number;
}

function offsetToLineCol(
  text: string,
  offset: number,
  baseLine: number,
): { line: number; column: number } {
  const before = text.substring(0, offset);
  const newlineCount = (before.match(/\r?\n/g) ?? []).length;
  const lastNewline = Math.max(
    before.lastIndexOf('\n'),
    before.lastIndexOf('\r'),
  );
  return {
    line: baseLine + newlineCount,
    column: lastNewline === -1 ? offset + 1 : offset - lastNewline,
  };
}

function scanText(
  text: string,
  filePath: string,
  baseLine: number,
): AgentFinding[] {
  const findings: AgentFinding[] = [];
  for (const pattern of C_PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let m: RegExpExecArray | null;
    const seenAt = new Set<number>();
    while ((m = re.exec(text)) !== null) {
      if (seenAt.has(m.index)) {
        if (m.index === re.lastIndex) re.lastIndex++;
        continue;
      }
      seenAt.add(m.index);
      const { line, column } = offsetToLineCol(text, m.index, baseLine);
      const matched = m[0];
      findings.push({
        ruleId: `vh-agent-${pattern.id.toLowerCase()}`,
        severity: 'high',
        category: 'shell',
        file: filePath,
        line,
        column,
        snippet: matched.length > 60 ? matched.slice(0, 57) + '…' : matched,
        message: `Dangerous shell command: ${pattern.description}`,
        fixHint:
          'Skill body or script will be read by the agent. If the agent calls this directly or includes it in its plan, the host system is at risk. Remove the command or move it behind an explicit confirmation prompt.',
      });
    }
  }
  return findings;
}

export async function applyRuleC(
  agents: AgentDetected[],
): Promise<RuleCResult> {
  const findings: AgentFinding[] = [];
  let filesScanned = 0;

  for (const agent of agents) {
    if (!agent.skillsPath) continue;

    // Two file globs:
    //   - SKILL.md body: scanned via parser
    //   - scripts/**/* (any text file): scanned as raw text
    const skillFiles = await fg(['**/SKILL.md'], {
      cwd: agent.skillsPath,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    const scriptFiles = await fg(['**/scripts/**/*'], {
      cwd: agent.skillsPath,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });

    const BATCH = 10;
    const allFiles = [...skillFiles, ...scriptFiles];
    for (let i = 0; i < allFiles.length; i += BATCH) {
      const slice = allFiles.slice(i, i + BATCH);
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

        if (path.endsWith('SKILL.md')) {
          const parsed = parseSkillMdContent(path, content);
          findings.push(
            ...scanText(parsed.body, path, parsed.bodyStartLine),
          );
        } else {
          // scripts/* — scan whole content from line 1
          findings.push(...scanText(content, path, 1));
        }
      }
    }
  }

  return { findings, filesScanned };
}
