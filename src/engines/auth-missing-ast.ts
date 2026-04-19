import {
  Project,
  SyntaxKind,
  type SourceFile,
  type FunctionDeclaration,
  type ArrowFunction,
  type FunctionExpression,
  type CallExpression,
  type Node,
  type Identifier,
  type PropertyAccessExpression,
  type ElementAccessExpression,
  type AsExpression,
  type ParenthesizedExpression,
  type NonNullExpression,
} from 'ts-morph';
import type { Finding, FileContext } from '../core/types.js';

const HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

const DEFAULT_AUTH_IDENTIFIERS = new Set([
  'auth',
  'getServerSession',
  'getSession',
  'requireAuth',
  'currentUser',
  'createServerClient',
  'createRouteHandlerClient',
  'createServerComponentClient',
  'clerkClient',
  'withAuth',
  'getToken',
  'verifyAuth',
  'getUser',
]);

/**
 * Tokens that, when present in an API route handler body, signal the
 * handler protects itself via a shared-secret bearer token. This is
 * the standard Vercel Cron / webhook pattern. Previously the scanner
 * only looked for auth-provider calls, which produced false positives
 * on correctly-protected cron and webhook endpoints.
 */
const SECRET_ENV_PATTERNS = [
  /\bCRON_SECRET\b/,
  /\bWEBHOOK_SECRET\b/,
  /\bAPI_SECRET\b/,
  /\bACTION_SECRET\b/,
  /\bINTERNAL_SECRET\b/,
  /\bREVALIDATE_TOKEN\b/,
  /Bearer\s*\$\{[^}]*\bprocess\.env\.[A-Z0-9_]+/,
];

const CHAINED_AUTH_METHODS = new Set([
  'getUser',
  'getSession',
  'getToken',
  'getServerSession',
  'currentUser',
]);

type HandlerNode = FunctionDeclaration | ArrowFunction | FunctionExpression;

interface HttpHandler {
  name: string;
  node: HandlerNode;
}

export interface ScanAuthOptions {
  authIdentifiers?: Set<string>;
  helperDepth?: number;
  ruleId?: string;
}

export function scanAuthMissing(
  filePath: string,
  sourceText: string,
  opts: ScanAuthOptions = {},
): Finding[] {
  const authIds = opts.authIdentifiers ?? DEFAULT_AUTH_IDENTIFIERS;
  const maxDepth = opts.helperDepth ?? 1;
  const ruleId = opts.ruleId ?? 'vh-auth-missing-middleware';

  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, noEmit: true, jsx: 2 },
  });
  const sf = project.createSourceFile(filePath, sourceText, { overwrite: true });

  const handlers = collectHttpHandlers(sf);
  const helpers = buildLocalHelperIndex(sf);

  const findings: Finding[] = [];
  for (const { name, node } of handlers) {
    if (containsAuthCall(node, authIds, helpers, maxDepth, new Set())) continue;
    if (hasSharedSecretCheck(node)) continue;

    const start = node.getStart();
    const { line, column } = sf.getLineAndColumnAtPos(start);
    findings.push({
      ruleId,
      severity: 'high',
      category: 'auth',
      file: filePath,
      line,
      column,
      snippet: `export async function ${name}(...)`,
      message: `API handler ${name} has no detectable auth check`,
      remediation:
        'Call auth() / getServerSession() / requireAuth() at the top of the handler and return 401 when unauthenticated. For Vercel Cron / webhooks, compare the Authorization header against process.env.CRON_SECRET.',
      metadata: { method: name },
    });
  }
  return findings;
}

/**
 * True if the handler body contains a reference to a shared-secret env
 * var (CRON_SECRET, WEBHOOK_SECRET, etc.) — indicating the endpoint is
 * protected by a bearer token check, the standard pattern for Vercel
 * Cron jobs and inbound webhooks.
 */
function hasSharedSecretCheck(handler: HandlerNode): boolean {
  const text = handler.getText();
  return SECRET_ENV_PATTERNS.some((re) => re.test(text));
}

function collectHttpHandlers(sf: SourceFile): HttpHandler[] {
  const out: HttpHandler[] = [];

  for (const fn of sf.getFunctions()) {
    if (!fn.isExported()) continue;
    const name = fn.getName();
    if (name && HTTP_METHODS.has(name)) {
      out.push({ name, node: fn });
    }
  }

  for (const vs of sf.getVariableStatements()) {
    if (!vs.isExported()) continue;
    for (const decl of vs.getDeclarations()) {
      const name = decl.getName();
      if (!HTTP_METHODS.has(name)) continue;
      const init = decl.getInitializer();
      if (!init) continue;

      const k = init.getKind();
      if (k === SyntaxKind.ArrowFunction) {
        out.push({ name, node: init as ArrowFunction });
      } else if (k === SyntaxKind.FunctionExpression) {
        out.push({ name, node: init as FunctionExpression });
      }
    }
  }
  return out;
}

function buildLocalHelperIndex(sf: SourceFile): Map<string, HandlerNode> {
  const map = new Map<string, HandlerNode>();
  for (const fn of sf.getFunctions()) {
    const name = fn.getName();
    if (name) map.set(name, fn);
  }
  for (const vs of sf.getVariableStatements()) {
    for (const decl of vs.getDeclarations()) {
      const name = decl.getName();
      const init = decl.getInitializer();
      if (!init) continue;
      const k = init.getKind();
      if (k === SyntaxKind.ArrowFunction) {
        map.set(name, init as ArrowFunction);
      } else if (k === SyntaxKind.FunctionExpression) {
        map.set(name, init as FunctionExpression);
      }
    }
  }
  return map;
}

/**
 * Walk down an expression to find the leftmost Identifier.
 * Handles chains like `createServerClient(url).auth.getUser()`,
 * `(supabase as SupabaseClient).auth.getUser()`, and `(x!).auth.getUser()`
 * by unwrapping CallExpression, PropertyAccess, ElementAccess, AsExpression,
 * ParenthesizedExpression, and NonNullExpression.
 * Returns null if the root isn't a simple Identifier (e.g. `this`, `super`).
 */
function getRootIdentifier(expr: Node): string | null {
  let cur: Node = expr;
  let guard = 0;
  while (guard++ < 64) {
    const k = cur.getKind();
    if (k === SyntaxKind.Identifier) return (cur as Identifier).getText();
    if (k === SyntaxKind.CallExpression) {
      cur = (cur as CallExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.PropertyAccessExpression) {
      cur = (cur as PropertyAccessExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.ElementAccessExpression) {
      cur = (cur as ElementAccessExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.AsExpression) {
      cur = (cur as AsExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.ParenthesizedExpression) {
      cur = (cur as ParenthesizedExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.NonNullExpression) {
      cur = (cur as NonNullExpression).getExpression();
      continue;
    }
    return null;
  }
  return null;
}

/**
 * Collect the chain segments of a PropertyAccess / ElementAccess chain
 * (excluding the root identifier).
 *   supabase.auth.getUser       → ['auth', 'getUser']
 *   supabase['auth']['getUser'] → ['auth', 'getUser']
 */
function getPropertyChainSegments(
  expr: PropertyAccessExpression | ElementAccessExpression,
): string[] {
  const segments: string[] = [];
  let cur: Node = expr;
  let guard = 0;
  while (guard++ < 64) {
    const k = cur.getKind();
    if (k === SyntaxKind.PropertyAccessExpression) {
      const pa = cur as PropertyAccessExpression;
      segments.unshift(pa.getName());
      cur = pa.getExpression();
      continue;
    }
    if (k === SyntaxKind.ElementAccessExpression) {
      const ea = cur as ElementAccessExpression;
      const arg = ea.getArgumentExpression();
      if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
        segments.unshift(arg.getText().slice(1, -1));
      }
      cur = ea.getExpression();
      continue;
    }
    if (k === SyntaxKind.AsExpression) {
      cur = (cur as AsExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.ParenthesizedExpression) {
      cur = (cur as ParenthesizedExpression).getExpression();
      continue;
    }
    if (k === SyntaxKind.NonNullExpression) {
      cur = (cur as NonNullExpression).getExpression();
      continue;
    }
    break;
  }
  return segments;
}

function isAuthCall(call: CallExpression, authIds: Set<string>): boolean {
  const expr = call.getExpression();
  const k = expr.getKind();

  if (k === SyntaxKind.Identifier) {
    return authIds.has((expr as Identifier).getText());
  }

  if (
    k === SyntaxKind.PropertyAccessExpression ||
    k === SyntaxKind.ElementAccessExpression
  ) {
    const chain = expr as PropertyAccessExpression | ElementAccessExpression;
    const root = getRootIdentifier(chain);
    if (root && authIds.has(root)) return true;

    const segments = getPropertyChainSegments(chain);
    const methodName = segments[segments.length - 1];
    if (
      methodName &&
      CHAINED_AUTH_METHODS.has(methodName) &&
      segments.slice(0, -1).includes('auth')
    ) {
      return true;
    }
  }
  return false;
}

function containsAuthCall(
  handler: HandlerNode,
  authIds: Set<string>,
  helpers: Map<string, HandlerNode>,
  depthLeft: number,
  visited: Set<string>,
): boolean {
  const calls = handler.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    if (isAuthCall(call, authIds)) return true;
  }

  if (depthLeft <= 0) return false;

  for (const call of calls) {
    const expr = call.getExpression();
    if (expr.getKind() !== SyntaxKind.Identifier) continue;
    const helperName = (expr as Identifier).getText();
    if (visited.has(helperName)) continue;
    const helper = helpers.get(helperName);
    if (!helper) continue;

    const nextVisited = new Set(visited);
    nextVisited.add(helperName);
    if (
      containsAuthCall(helper, authIds, helpers, depthLeft - 1, nextVisited)
    ) {
      return true;
    }
  }
  return false;
}
