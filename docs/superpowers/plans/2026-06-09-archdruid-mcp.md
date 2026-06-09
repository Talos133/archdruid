# Archdruid MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MCP server (`archdruid`) with a Next.js 15 web UI that searches GitHub, arXiv, Stack Overflow, and Reddit, exposing two MCP tools (`falcon` and `pouch`) usable from Claude Code, Cursor, and VS Code.

**Architecture:** pnpm monorepo with Turborepo — `@archdruid/core` (retrieval engine), `@archdruid/mcp` (stdio server), `apps/web` (Next.js UI). The CLI entry point at the root `archdruid` binary dispatches to either the web server or the MCP stdio server.

**Tech Stack:** Node.js 20+, TypeScript, pnpm workspaces, Turborepo, `@modelcontextprotocol/sdk`, `@octokit/rest`, `fast-xml-parser`, Next.js 15 App Router, Tailwind CSS v4, Vitest.

---

## File Map

```
archdruid-mcp/
├── package.json                           root — scripts, devDeps, bin entry
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types.ts                   all shared interfaces
│   │       ├── config.ts                  read/write ~/.archdruid/config.json
│   │       ├── id.ts                      ID generation (structured + hash fallback)
│   │       ├── cache.ts                   in-session result cache (Map)
│   │       ├── score.ts                   0-100 relevance scorer
│   │       ├── providers/
│   │       │   ├── github.ts
│   │       │   ├── arxiv.ts
│   │       │   ├── stackoverflow.ts
│   │       │   └── reddit.ts
│   │       ├── search.ts                  fans out to providers in parallel
│   │       ├── content.ts                 getContent() by ID
│   │       └── index.ts                   re-exports public API
│   │   └── tests/
│   │       ├── config.test.ts
│   │       ├── id.test.ts
│   │       ├── score.test.ts
│   │       ├── providers/
│   │       │   ├── github.test.ts
│   │       │   ├── arxiv.test.ts
│   │       │   ├── stackoverflow.test.ts
│   │       │   └── reddit.test.ts
│   │       ├── search.test.ts
│   │       └── content.test.ts
│   └── mcp/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── tools/
│           │   ├── falcon.ts              falcon tool definition + handler
│           │   └── pouch.ts               pouch tool definition + handler
│           └── index.ts                   stdio transport, registers tools
│       └── tests/
│           ├── falcon.test.ts
│           └── pouch.test.ts
└── apps/
    └── web/
        ├── package.json
        ├── tsconfig.json
        ├── next.config.ts
        ├── tailwind.config.ts
        └── app/
            ├── layout.tsx                 root layout + sidebar
            ├── globals.css                design tokens + base styles
            ├── page.tsx                   Search page
            ├── sources/page.tsx
            ├── connect/page.tsx
            ├── history/page.tsx
            └── api/
                ├── search/route.ts
                ├── content/[id]/route.ts
                ├── sources/route.ts
                ├── sources/[name]/route.ts
                └── history/route.ts
        └── components/
            ├── Sidebar.tsx
            ├── ResultCard.tsx
            ├── SourceBadge.tsx
            └── SearchBar.tsx
└── bin/
    └── archdruid.mjs                      CLI entry point
```

---

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/tsconfig.json`
- Create: `apps/web/package.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "archdruid-workspace",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Create packages/core/package.json**

```json
{
  "name": "@archdruid/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@octokit/rest": "^20.1.0",
    "fast-xml-parser": "^4.3.6"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 6: Create packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "tests"]
}
```

- [ ] **Step 7: Create packages/mcp/package.json**

```json
{
  "name": "@archdruid/mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@archdruid/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 8: Create packages/mcp/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "tests"]
}
```

- [ ] **Step 9: Create apps/web/package.json**

```json
{
  "name": "@archdruid/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3131",
    "build": "next build",
    "start": "next start -p 3131",
    "lint": "next lint"
  },
  "dependencies": {
    "@archdruid/core": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

- [ ] **Step 10: Install dependencies and verify workspace links**

```bash
cd /Users/Tal/archdruid-mcp
pnpm install
```

Expected: `node_modules` at root, symlinks in `packages/mcp/node_modules/@archdruid/core`.

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json packages/ apps/web/package.json
git commit -m "feat: monorepo scaffolding — pnpm workspaces + turborepo"
```

---

### Task 2: Core Types

**Files:**
- Create: `packages/core/src/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export type Provider = 'github' | 'arxiv' | 'stackoverflow' | 'reddit'
export type Kind = 'file' | 'repo' | 'paper' | 'question' | 'post'

export interface DateRange {
  from: Date
  to?: Date
}

export interface SearchOptions {
  sources?: Provider[]
  maxResults?: number
  language?: string
  minStars?: number
  dateRange?: DateRange | 'all'
}

export interface Result {
  id: string
  provider: Provider
  kind: Kind
  title: string
  summary: string
  content?: string
  language?: string
  score: number
  metrics: {
    stars?: number
    votes?: number
    citations?: number
    views?: number
    answers?: number
  }
  links: {
    html: string
    raw?: string
    pdf?: string
  }
  timestamps: {
    published: Date | null
    updated: Date
  }
  evidence: { snippet: string; highlight?: string }[]
  attribution: { source: string; method: 'api' | 'headless' }
}

export interface SourceConfig {
  github: { enabled: boolean; token: string }
  arxiv: { enabled: boolean }
  stackoverflow: { enabled: boolean; key: string }
  reddit: { enabled: boolean; clientId: string; clientSecret: string }
}

export interface Config {
  sources: SourceConfig
  defaults: {
    maxResults: number
    dateFilter: {
      enabled: boolean
      lookbackMonths: number
      allowOverride: boolean
    }
  }
}

export interface HistoryEntry {
  query: string
  sources: Provider[]
  resultCount: number
  durationMs: number
  calledFrom: 'web' | 'mcp'
  timestamp: string
}
```

- [ ] **Step 2: Build to verify no type errors**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm build
```

Expected: `dist/types.js` and `dist/types.d.ts` created, no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): shared TypeScript types"
```

---

### Task 3: Core Config

**Files:**
- Create: `packages/core/src/config.ts`
- Create: `packages/core/tests/config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, saveConfig, defaultConfig } from '../src/config.js'

const ORIG_HOME = process.env.HOME

describe('config', () => {
  let tmpHome: string

  beforeEach(() => {
    tmpHome = mkdtempSync(join(tmpdir(), 'archdruid-test-'))
    process.env.HOME = tmpHome
  })

  afterEach(() => {
    process.env.HOME = ORIG_HOME
    rmSync(tmpHome, { recursive: true, force: true })
  })

  it('returns default config when no file exists', async () => {
    const cfg = await loadConfig()
    expect(cfg.defaults.maxResults).toBe(20)
    expect(cfg.sources.github.enabled).toBe(true)
    expect(cfg.sources.reddit.enabled).toBe(false)
  })

  it('creates config file on first load', async () => {
    await loadConfig()
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(tmpHome, '.archdruid', 'config.json'))).toBe(true)
  })

  it('round-trips a modified config', async () => {
    const cfg = await loadConfig()
    cfg.sources.github.token = 'ghp_test123'
    await saveConfig(cfg)
    const reloaded = await loadConfig()
    expect(reloaded.sources.github.token).toBe('ghp_test123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | head -30
```

Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 3: Implement config.ts**

```typescript
// packages/core/src/config.ts
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Config } from './types.js'

export function configDir(): string {
  return join(process.env.HOME ?? homedir(), '.archdruid')
}

export function configPath(): string {
  return join(configDir(), 'config.json')
}

export function historyPath(): string {
  return join(configDir(), 'history.json')
}

export const defaultConfig: Config = {
  sources: {
    github:        { enabled: true,  token: '' },
    arxiv:         { enabled: true },
    stackoverflow: { enabled: true,  key: '' },
    reddit:        { enabled: false, clientId: '', clientSecret: '' },
  },
  defaults: {
    maxResults: 20,
    dateFilter: {
      enabled: true,
      lookbackMonths: 6,
      allowOverride: true,
    },
  },
}

export async function loadConfig(): Promise<Config> {
  await mkdir(configDir(), { recursive: true })
  try {
    const raw = await readFile(configPath(), 'utf8')
    return JSON.parse(raw) as Config
  } catch {
    await writeFile(configPath(), JSON.stringify(defaultConfig, null, 2))
    return structuredClone(defaultConfig)
  }
}

export async function saveConfig(cfg: Config): Promise<void> {
  await mkdir(configDir(), { recursive: true })
  await writeFile(configPath(), JSON.stringify(cfg, null, 2))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config.ts packages/core/tests/config.test.ts
git commit -m "feat(core): config load/save with default creation"
```

---

### Task 4: Core ID Generation + Session Cache

**Files:**
- Create: `packages/core/src/id.ts`
- Create: `packages/core/src/cache.ts`
- Create: `packages/core/tests/id.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/id.test.ts
import { describe, it, expect } from 'vitest'
import { makeStructuredId, makeHashId, parseProvider } from '../src/id.js'

describe('makeStructuredId', () => {
  it('github file', () => {
    expect(makeStructuredId('github', 'file', 'sindresorhus/p-retry/index.ts'))
      .toBe('github:file:sindresorhus/p-retry/index.ts')
  })
  it('arxiv paper', () => {
    expect(makeStructuredId('arxiv', 'paper', '2301.07041'))
      .toBe('arxiv:paper:2301.07041')
  })
})

describe('makeHashId', () => {
  it('produces 12-char hex suffix', () => {
    const id = makeHashId('github', 'https://github.com/foo/bar', 'Test Title')
    expect(id).toMatch(/^github:hash:[0-9a-f]{12}$/)
  })
  it('is deterministic', () => {
    const a = makeHashId('github', 'https://github.com/foo/bar', 'Test Title')
    const b = makeHashId('github', 'https://github.com/foo/bar', 'Test Title')
    expect(a).toBe(b)
  })
})

describe('parseProvider', () => {
  it('extracts provider from structured id', () => {
    expect(parseProvider('github:file:sindresorhus/p-retry/index.ts')).toBe('github')
    expect(parseProvider('arxiv:paper:2301.07041')).toBe('arxiv')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | head -20
```

Expected: FAIL — `Cannot find module '../src/id.js'`

- [ ] **Step 3: Implement id.ts**

```typescript
// packages/core/src/id.ts
import { createHash } from 'node:crypto'
import type { Provider, Kind } from './types.js'

export function makeStructuredId(provider: Provider, kind: Kind, key: string): string {
  return `${provider}:${kind}:${key}`
}

export function makeHashId(provider: Provider, url: string, title: string): string {
  const hash = createHash('sha256')
    .update(provider + url + title)
    .digest('hex')
    .slice(0, 12)
  return `${provider}:hash:${hash}`
}

export function parseProvider(id: string): Provider {
  return id.split(':')[0] as Provider
}

export function isHashId(id: string): boolean {
  return id.includes(':hash:')
}
```

- [ ] **Step 4: Create cache.ts**

```typescript
// packages/core/src/cache.ts
import type { Result } from './types.js'

const store = new Map<string, Result>()

export function cacheSet(result: Result): void {
  store.set(result.id, result)
}

export function cacheGet(id: string): Result | undefined {
  return store.get(id)
}

export function cacheGetByUrl(url: string): Result | undefined {
  for (const result of store.values()) {
    if (result.links.html === url) return result
  }
  return undefined
}

export function cacheClear(): void {
  store.clear()
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all tests pass including previous config tests.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/id.ts packages/core/src/cache.ts packages/core/tests/id.test.ts
git commit -m "feat(core): ID generation (structured + hash) + session cache"
```

---

### Task 5: Core Score

**Files:**
- Create: `packages/core/src/score.ts`
- Create: `packages/core/tests/score.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/score.test.ts
import { describe, it, expect } from 'vitest'
import { computeScore } from '../src/score.js'
import type { Result } from '../src/types.js'

function makeResult(overrides: Partial<Result>): Result {
  return {
    id: 'github:repo:foo/bar',
    provider: 'github',
    kind: 'repo',
    title: 'foo bar',
    summary: 'foo bar baz',
    score: 0,
    metrics: {},
    links: { html: 'https://example.com' },
    timestamps: { published: null, updated: new Date() },
    evidence: [{ snippet: 'foo bar', highlight: 'foo' }],
    attribution: { source: 'github', method: 'api' },
    ...overrides,
  }
}

describe('computeScore', () => {
  it('gives higher score to recent results', () => {
    const recent = makeResult({ timestamps: { published: null, updated: new Date() } })
    const old = makeResult({
      timestamps: { published: null, updated: new Date('2020-01-01') },
    })
    const scoreRecent = computeScore(recent, 'foo bar')
    const scoreOld = computeScore(old, 'foo bar')
    expect(scoreRecent).toBeGreaterThan(scoreOld)
  })

  it('gives higher score when query terms match title', () => {
    const match = makeResult({ title: 'foo bar exact match', summary: 'something' })
    const noMatch = makeResult({ title: 'completely different', summary: 'something' })
    expect(computeScore(match, 'foo bar')).toBeGreaterThan(computeScore(noMatch, 'foo bar'))
  })

  it('returns value between 0 and 100', () => {
    const result = makeResult({})
    const s = computeScore(result, 'foo bar')
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../src/score.js'`

- [ ] **Step 3: Implement score.ts**

```typescript
// packages/core/src/score.ts
import type { Result } from './types.js'

const RECENCY_WEIGHT = 0.4
const KEYWORD_WEIGHT = 0.4
const METRICS_WEIGHT = 0.2

export function computeScore(result: Result, query: string): number {
  const recency = recencyScore(result.timestamps.updated)
  const keyword = keywordScore(result, query)
  const metrics = metricsScore(result)
  const raw = recency * RECENCY_WEIGHT + keyword * KEYWORD_WEIGHT + metrics * METRICS_WEIGHT
  return Math.round(Math.min(100, Math.max(0, raw * 100)))
}

function recencyScore(updated: Date): number {
  const ageMs = Date.now() - updated.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  // Decay: 1.0 at 0 days, 0.5 at 180 days, ~0 at 730 days
  return Math.max(0, 1 - ageDays / 730)
}

function keywordScore(result: Result, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0
  const haystack = [
    result.title,
    result.summary,
    ...result.evidence.map(e => e.snippet),
  ].join(' ').toLowerCase()
  const matched = terms.filter(t => haystack.includes(t)).length
  return matched / terms.length
}

function metricsScore(result: Result): number {
  const { stars = 0, votes = 0, views = 0 } = result.metrics
  const signal = stars * 2 + votes * 3 + views * 0.001
  // Soft-cap via sigmoid-like curve
  return Math.min(1, signal / 2000)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all score tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/score.ts packages/core/tests/score.test.ts
git commit -m "feat(core): relevance scorer (recency + keyword + metrics)"
```

---

### Task 6: GitHub Provider

**Files:**
- Create: `packages/core/src/providers/github.ts`
- Create: `packages/core/tests/providers/github.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/providers/github.test.ts
import { describe, it, expect, vi } from 'vitest'
import { searchGitHub } from '../../src/providers/github.js'

vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      rest: {
        search: {
          code: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  name: 'index.ts',
                  path: 'src/index.ts',
                  repository: {
                    full_name: 'foo/bar',
                    stargazers_count: 150,
                    updated_at: '2025-10-01T00:00:00Z',
                    html_url: 'https://github.com/foo/bar',
                    description: 'A test repo',
                  },
                  html_url: 'https://github.com/foo/bar/blob/main/src/index.ts',
                  url: 'https://api.github.com/repos/foo/bar/contents/src/index.ts',
                  text_matches: [{ fragment: 'const x = 1' }],
                },
              ],
            },
          }),
        },
      },
    })),
  }
})

describe('searchGitHub', () => {
  it('returns mapped results', async () => {
    const results = await searchGitHub('typescript retry', {
      token: 'fake',
      maxResults: 5,
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('github')
    expect(results[0].kind).toBe('file')
    expect(results[0].title).toBe('src/index.ts')
    expect(results[0].metrics.stars).toBe(150)
  })

  it('returns empty array on empty token without throwing', async () => {
    const results = await searchGitHub('typescript retry', {
      token: '',
      maxResults: 5,
    })
    expect(Array.isArray(results)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../../src/providers/github.js'`

- [ ] **Step 3: Implement providers/github.ts**

```typescript
// packages/core/src/providers/github.ts
import { Octokit } from '@octokit/rest'
import type { Result, DateRange } from '../types.js'
import { makeStructuredId, makeHashId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface GitHubOptions {
  token: string
  maxResults: number
  language?: string
  minStars?: number
  dateRange?: DateRange | 'all'
}

export async function searchGitHub(query: string, opts: GitHubOptions): Promise<Result[]> {
  if (!opts.token) return []

  const octokit = new Octokit({ auth: opts.token })

  let q = query
  if (opts.language) q += ` language:${opts.language}`
  if (opts.minStars) q += ` stars:>=${opts.minStars}`

  if (opts.dateRange && opts.dateRange !== 'all') {
    const from = opts.dateRange.from.toISOString().slice(0, 10)
    q += ` pushed:>=${from}`
  }

  try {
    const res = await octokit.rest.search.code({
      q,
      per_page: Math.min(opts.maxResults, 30),
    })

    const results: Result[] = res.data.items.map(item => {
      const repoName = item.repository.full_name
      const id = makeStructuredId('github', 'file', `${repoName}/${item.path}`)
      const result: Result = {
        id,
        provider: 'github',
        kind: 'file',
        title: item.path,
        summary: item.repository.description ?? repoName,
        score: 0,
        metrics: { stars: item.repository.stargazers_count ?? 0 },
        links: {
          html: item.html_url,
          raw: item.url,
        },
        timestamps: {
          published: null,
          updated: new Date(item.repository.updated_at ?? Date.now()),
        },
        evidence: (item.text_matches ?? []).map(m => ({ snippet: m.fragment ?? '' })),
        attribution: { source: 'github', method: 'api' },
      }
      result.score = computeScore(result, query)
      cacheSet(result)
      return result
    })

    return results
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 403) return []
    throw err
  }
}

export async function getGitHubContent(result: Result, token: string): Promise<Result> {
  if (!token) return result
  const octokit = new Octokit({ auth: token })
  if (!result.links.raw) return result

  const res = await octokit.request('GET {url}', { url: result.links.raw })
  const content = Buffer.from(res.data.content, 'base64').toString('utf8')
  return { ...result, content }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all github tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/providers/github.ts packages/core/tests/providers/github.test.ts
git commit -m "feat(core): GitHub provider — code search + content fetch"
```

---

### Task 7: arXiv Provider

**Files:**
- Create: `packages/core/src/providers/arxiv.ts`
- Create: `packages/core/tests/providers/arxiv.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/providers/arxiv.test.ts
import { describe, it, expect, vi } from 'vitest'
import { searchArxiv } from '../../src/providers/arxiv.js'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  text: async () => `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.07041v1</id>
    <title>Attention Is All You Need</title>
    <summary>We propose a new model architecture, the Transformer.</summary>
    <published>2023-01-17T00:00:00Z</published>
    <updated>2023-03-01T00:00:00Z</updated>
    <author><name>Vaswani</name></author>
    <link href="http://arxiv.org/abs/2301.07041v1" rel="alternate"/>
    <link href="http://arxiv.org/pdf/2301.07041v1" title="pdf" type="application/pdf"/>
  </entry>
</feed>`,
}))

describe('searchArxiv', () => {
  it('maps arXiv Atom feed to Result[]', async () => {
    const results = await searchArxiv('transformer attention', { maxResults: 5 })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('arxiv')
    expect(results[0].kind).toBe('paper')
    expect(results[0].id).toBe('arxiv:paper:2301.07041')
    expect(results[0].links.pdf).toContain('pdf')
    expect(results[0].timestamps.published).toBeInstanceOf(Date)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../../src/providers/arxiv.js'`

- [ ] **Step 3: Implement providers/arxiv.ts**

```typescript
// packages/core/src/providers/arxiv.ts
import { XMLParser } from 'fast-xml-parser'
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface ArxivOptions {
  maxResults: number
  dateRange?: DateRange | 'all'
}

const ARXIV_API = 'https://export.arxiv.org/api/query'
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

export async function searchArxiv(query: string, opts: ArxivOptions): Promise<Result[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    max_results: String(opts.maxResults),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  })

  const res = await fetch(`${ARXIV_API}?${params}`)
  const xml = await res.text()
  const parsed = parser.parse(xml)

  const entries = parsed?.feed?.entry
  if (!entries) return []
  const list = Array.isArray(entries) ? entries : [entries]

  const results: Result[] = list.map((entry: Record<string, unknown>) => {
    const rawId = String(entry.id ?? '')
    const arxivId = rawId.split('/abs/')[1]?.replace(/v\d+$/, '') ?? rawId
    const links = Array.isArray(entry.link) ? entry.link : [entry.link]
    const pdfLink = links.find((l: Record<string, string>) => l?.['@_title'] === 'pdf')
    const htmlLink = links.find((l: Record<string, string>) => l?.['@_rel'] === 'alternate')
    const updated = new Date(String(entry.updated ?? Date.now()))
    const published = entry.published ? new Date(String(entry.published)) : null

    const result: Result = {
      id: makeStructuredId('arxiv', 'paper', arxivId),
      provider: 'arxiv',
      kind: 'paper',
      title: String(entry.title ?? '').trim(),
      summary: String(entry.summary ?? '').trim(),
      score: 0,
      metrics: {},
      links: {
        html: String(htmlLink?.['@_href'] ?? `https://arxiv.org/abs/${arxivId}`),
        pdf: pdfLink ? String(pdfLink['@_href']) : undefined,
      },
      timestamps: { published, updated },
      evidence: [{ snippet: String(entry.summary ?? '').trim().slice(0, 300) }],
      attribution: { source: 'arxiv', method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })

  if (opts.dateRange && opts.dateRange !== 'all') {
    const from = opts.dateRange.from.getTime()
    const to = (opts.dateRange.to ?? new Date()).getTime()
    return results.filter(r => {
      const t = r.timestamps.updated.getTime()
      return t >= from && t <= to
    })
  }

  return results
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all arxiv tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/providers/arxiv.ts packages/core/tests/providers/arxiv.test.ts
git commit -m "feat(core): arXiv provider — Atom feed search with date filtering"
```

---

### Task 8: Stack Overflow Provider

**Files:**
- Create: `packages/core/src/providers/stackoverflow.ts`
- Create: `packages/core/tests/providers/stackoverflow.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/providers/stackoverflow.test.ts
import { describe, it, expect, vi } from 'vitest'
import { searchStackOverflow } from '../../src/providers/stackoverflow.js'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  json: async () => ({
    items: [
      {
        question_id: 11828004,
        title: 'How to retry a fetch request in TypeScript?',
        link: 'https://stackoverflow.com/questions/11828004',
        body_markdown: 'I want to retry a failed fetch...',
        score: 42,
        view_count: 15000,
        answer_count: 3,
        creation_date: 1672531200,
        last_activity_date: 1704067200,
        tags: ['typescript', 'fetch'],
      },
    ],
  }),
}))

describe('searchStackOverflow', () => {
  it('maps SO API response to Result[]', async () => {
    const results = await searchStackOverflow('typescript fetch retry', {
      key: '',
      maxResults: 5,
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('stackoverflow')
    expect(results[0].kind).toBe('question')
    expect(results[0].id).toBe('stackoverflow:question:11828004')
    expect(results[0].metrics.votes).toBe(42)
    expect(results[0].metrics.answers).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../../src/providers/stackoverflow.js'`

- [ ] **Step 3: Implement providers/stackoverflow.ts**

```typescript
// packages/core/src/providers/stackoverflow.ts
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface SOOptions {
  key: string
  maxResults: number
  dateRange?: DateRange | 'all'
}

export async function searchStackOverflow(query: string, opts: SOOptions): Promise<Result[]> {
  const params = new URLSearchParams({
    q: query,
    order: 'desc',
    sort: 'relevance',
    site: 'stackoverflow',
    pagesize: String(Math.min(opts.maxResults, 30)),
    filter: 'withbody',
    ...(opts.key ? { key: opts.key } : {}),
  })

  if (opts.dateRange && opts.dateRange !== 'all') {
    params.set('fromdate', String(Math.floor(opts.dateRange.from.getTime() / 1000)))
    if (opts.dateRange.to) {
      params.set('todate', String(Math.floor(opts.dateRange.to.getTime() / 1000)))
    }
  }

  const res = await fetch(`https://api.stackexchange.com/2.3/search/advanced?${params}`)
  const data = await res.json() as { items: Record<string, unknown>[] }

  return data.items.map(item => {
    const id = makeStructuredId('stackoverflow', 'question', String(item.question_id))
    const result: Result = {
      id,
      provider: 'stackoverflow',
      kind: 'question',
      title: String(item.title ?? ''),
      summary: String(item.body_markdown ?? '').slice(0, 400),
      score: 0,
      metrics: {
        votes: Number(item.score ?? 0),
        views: Number(item.view_count ?? 0),
        answers: Number(item.answer_count ?? 0),
      },
      links: { html: String(item.link ?? '') },
      timestamps: {
        published: new Date(Number(item.creation_date) * 1000),
        updated: new Date(Number(item.last_activity_date) * 1000),
      },
      evidence: [{ snippet: String(item.body_markdown ?? '').slice(0, 300) }],
      attribution: { source: 'stackoverflow', method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all stackoverflow tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/providers/stackoverflow.ts packages/core/tests/providers/stackoverflow.test.ts
git commit -m "feat(core): Stack Overflow provider — search API with date range"
```

---

### Task 9: Reddit Provider

**Files:**
- Create: `packages/core/src/providers/reddit.ts`
- Create: `packages/core/tests/providers/reddit.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/providers/reddit.test.ts
import { describe, it, expect, vi } from 'vitest'
import { searchReddit } from '../../src/providers/reddit.js'

vi.stubGlobal('fetch', vi.fn()
  .mockResolvedValueOnce({
    json: async () => ({ access_token: 'mock_token', token_type: 'bearer' }),
  })
  .mockResolvedValueOnce({
    json: async () => ({
      data: {
        children: [
          {
            data: {
              id: 'abc123',
              title: 'Best TypeScript fetch retry patterns?',
              selftext: 'Looking for retry patterns in TS...',
              url: 'https://www.reddit.com/r/typescript/comments/abc123',
              score: 87,
              num_comments: 14,
              created_utc: 1704067200,
              subreddit: 'typescript',
            },
          },
        ],
      },
    }),
  })
)

describe('searchReddit', () => {
  it('maps Reddit API response to Result[]', async () => {
    const results = await searchReddit('typescript fetch retry', {
      clientId: 'test_id',
      clientSecret: 'test_secret',
      maxResults: 5,
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('reddit')
    expect(results[0].kind).toBe('post')
    expect(results[0].id).toBe('reddit:post:t3_abc123')
    expect(results[0].metrics.votes).toBe(87)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../../src/providers/reddit.js'`

- [ ] **Step 3: Implement providers/reddit.ts**

```typescript
// packages/core/src/providers/reddit.ts
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface RedditOptions {
  clientId: string
  clientSecret: string
  maxResults: number
  dateRange?: DateRange | 'all'
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'archdruid/0.1.0',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function searchReddit(query: string, opts: RedditOptions): Promise<Result[]> {
  if (!opts.clientId || !opts.clientSecret) return []

  const token = await getAccessToken(opts.clientId, opts.clientSecret)
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(opts.maxResults, 25)),
    sort: 'relevance',
    type: 'link',
    t: 'all',
  })

  const res = await fetch(`https://oauth.reddit.com/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'archdruid/0.1.0',
    },
  })
  const data = await res.json() as { data: { children: { data: Record<string, unknown> }[] } }

  let posts = data.data.children.map(c => c.data)

  if (opts.dateRange && opts.dateRange !== 'all') {
    const from = opts.dateRange.from.getTime() / 1000
    const to = ((opts.dateRange.to ?? new Date()).getTime()) / 1000
    posts = posts.filter(p => Number(p.created_utc) >= from && Number(p.created_utc) <= to)
  }

  return posts.map(post => {
    const id = makeStructuredId('reddit', 'post', `t3_${post.id}`)
    const updated = new Date(Number(post.created_utc) * 1000)
    const result: Result = {
      id,
      provider: 'reddit',
      kind: 'post',
      title: String(post.title ?? ''),
      summary: String(post.selftext ?? '').slice(0, 400),
      score: 0,
      metrics: {
        votes: Number(post.score ?? 0),
        answers: Number(post.num_comments ?? 0),
      },
      links: { html: String(post.url ?? '') },
      timestamps: { published: updated, updated },
      evidence: [{ snippet: String(post.selftext ?? '').slice(0, 300) }],
      attribution: { source: `reddit.com/r/${post.subreddit}`, method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all reddit tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/providers/reddit.ts packages/core/tests/providers/reddit.test.ts
git commit -m "feat(core): Reddit provider — OAuth2 client credentials + search"
```

---

### Task 10: Core search()

**Files:**
- Create: `packages/core/src/search.ts`
- Create: `packages/core/tests/search.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/search.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/providers/github.js', () => ({
  searchGitHub: vi.fn().mockResolvedValue([
    {
      id: 'github:file:foo/bar/index.ts',
      provider: 'github', kind: 'file', title: 'index.ts', summary: 'foo',
      score: 80, metrics: { stars: 100 }, links: { html: 'https://github.com/foo/bar' },
      timestamps: { published: null, updated: new Date() },
      evidence: [], attribution: { source: 'github', method: 'api' },
    },
  ]),
}))
vi.mock('../src/providers/arxiv.js', () => ({ searchArxiv: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/providers/stackoverflow.js', () => ({ searchStackOverflow: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/providers/reddit.js', () => ({ searchReddit: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    sources: {
      github: { enabled: true, token: 'fake' },
      arxiv: { enabled: true },
      stackoverflow: { enabled: true, key: '' },
      reddit: { enabled: false, clientId: '', clientSecret: '' },
    },
    defaults: { maxResults: 20, dateFilter: { enabled: false, lookbackMonths: 6, allowOverride: true } },
  }),
}))

import { search } from '../src/search.js'

describe('search', () => {
  it('returns results from enabled providers', async () => {
    const results = await search('typescript retry')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].provider).toBe('github')
  })

  it('accepts source subset', async () => {
    const results = await search('typescript retry', { sources: ['github'] })
    expect(results.every(r => r.provider === 'github')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../src/search.js'`

- [ ] **Step 3: Implement search.ts**

```typescript
// packages/core/src/search.ts
import { loadConfig, historyPath } from './config.js'
import { searchGitHub } from './providers/github.js'
import { searchArxiv } from './providers/arxiv.js'
import { searchStackOverflow } from './providers/stackoverflow.js'
import { searchReddit } from './providers/reddit.js'
import type { Result, SearchOptions, DateRange } from './types.js'
import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function search(query: string, opts: SearchOptions = {}): Promise<Result[]> {
  const cfg = await loadConfig()
  const t0 = Date.now()

  const sources = opts.sources ?? (['github', 'arxiv', 'stackoverflow', 'reddit'] as const)
  const maxResults = opts.maxResults ?? cfg.defaults.maxResults

  let dateRange: DateRange | 'all' | undefined
  if (opts.dateRange !== undefined) {
    dateRange = opts.dateRange
  } else if (cfg.defaults.dateFilter.enabled) {
    const from = new Date()
    from.setMonth(from.getMonth() - cfg.defaults.dateFilter.lookbackMonths)
    dateRange = { from }
  }

  const tasks: Promise<Result[]>[] = []

  if (sources.includes('github') && cfg.sources.github.enabled) {
    tasks.push(searchGitHub(query, {
      token: cfg.sources.github.token,
      maxResults,
      language: opts.language,
      minStars: opts.minStars,
      dateRange,
    }))
  }
  if (sources.includes('arxiv') && cfg.sources.arxiv.enabled) {
    tasks.push(searchArxiv(query, { maxResults, dateRange }))
  }
  if (sources.includes('stackoverflow') && cfg.sources.stackoverflow.enabled) {
    tasks.push(searchStackOverflow(query, {
      key: cfg.sources.stackoverflow.key,
      maxResults,
      dateRange,
    }))
  }
  if (sources.includes('reddit') && cfg.sources.reddit.enabled) {
    tasks.push(searchReddit(query, {
      clientId: cfg.sources.reddit.clientId,
      clientSecret: cfg.sources.reddit.clientSecret,
      maxResults,
      dateRange,
    }))
  }

  const settled = await Promise.allSettled(tasks)
  const results = settled
    .filter(s => s.status === 'fulfilled')
    .flatMap(s => (s as PromiseFulfilledResult<Result[]>).value)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  await appendHistory({ query, sources: sources as string[], resultCount: results.length, durationMs: Date.now() - t0, calledFrom: 'mcp' })

  return results
}

async function appendHistory(entry: object): Promise<void> {
  const path = historyPath()
  await mkdir(dirname(path), { recursive: true })
  try {
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(path, 'utf8').catch(() => '[]')
    const arr: unknown[] = JSON.parse(raw)
    arr.push({ ...entry, timestamp: new Date().toISOString() })
    if (arr.length > 200) arr.splice(0, arr.length - 200)
    await appendFile(path, '') // ensure file exists
    const { writeFile } = await import('node:fs/promises')
    await writeFile(path, JSON.stringify(arr, null, 2))
  } catch {
    // history is best-effort
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all search tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/search.ts packages/core/tests/search.test.ts
git commit -m "feat(core): search() — parallel provider fan-out + history logging"
```

---

### Task 11: Core getContent()

**Files:**
- Create: `packages/core/src/content.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/tests/content.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/content.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockResult = {
  id: 'github:file:foo/bar/index.ts',
  provider: 'github' as const, kind: 'file' as const,
  title: 'index.ts', summary: 'foo', score: 80,
  metrics: { stars: 100 }, links: { html: 'https://github.com/foo/bar', raw: 'https://api.github.com/foo' },
  timestamps: { published: null, updated: new Date() },
  evidence: [], attribution: { source: 'github', method: 'api' as const },
}

vi.mock('../src/cache.js', () => ({
  cacheGet: vi.fn().mockReturnValue(mockResult),
  cacheSet: vi.fn(),
  cacheGetByUrl: vi.fn().mockReturnValue(undefined),
}))
vi.mock('../src/providers/github.js', () => ({
  getGitHubContent: vi.fn().mockResolvedValue({ ...mockResult, content: '// hello world' }),
}))
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    sources: { github: { enabled: true, token: 'fake' }, arxiv: { enabled: true }, stackoverflow: { enabled: true, key: '' }, reddit: { enabled: false, clientId: '', clientSecret: '' } },
    defaults: { maxResults: 20, dateFilter: { enabled: false, lookbackMonths: 6, allowOverride: true } },
  }),
}))

import { getContent } from '../src/content.js'

describe('getContent', () => {
  it('fetches full content for a github result', async () => {
    const result = await getContent('github:file:foo/bar/index.ts')
    expect(result.content).toBe('// hello world')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../src/content.js'`

- [ ] **Step 3: Implement content.ts**

```typescript
// packages/core/src/content.ts
import { cacheGet } from './cache.js'
import { loadConfig } from './config.js'
import { getGitHubContent } from './providers/github.js'
import type { Result } from './types.js'

export async function getContent(id: string): Promise<Result> {
  const cached = cacheGet(id)
  if (!cached) throw new Error(`Result not found in session cache: ${id}`)

  const cfg = await loadConfig()

  if (cached.provider === 'github') {
    return getGitHubContent(cached, cfg.sources.github.token)
  }

  // arXiv, SO, Reddit — return as-is (summary is the content for these)
  return { ...cached, content: cached.summary }
}
```

- [ ] **Step 4: Create packages/core/src/index.ts**

```typescript
// packages/core/src/index.ts
export { search } from './search.js'
export { getContent } from './content.js'
export { loadConfig, saveConfig, defaultConfig } from './config.js'
export type { Result, SearchOptions, Config, HistoryEntry, Provider, Kind, DateRange } from './types.js'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm test -- --reporter=verbose
```

Expected: all tests pass including content test.

- [ ] **Step 6: Build the core package**

```bash
cd /Users/Tal/archdruid-mcp/packages/core && pnpm build
```

Expected: `dist/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/content.ts packages/core/src/index.ts packages/core/tests/content.test.ts
git commit -m "feat(core): getContent() + public API index"
```

---

### Task 12: MCP falcon Tool

**Files:**
- Create: `packages/mcp/src/tools/falcon.ts`
- Create: `packages/mcp/tests/falcon.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/mcp/tests/falcon.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@archdruid/core', () => ({
  search: vi.fn().mockResolvedValue([
    {
      id: 'github:file:foo/bar/index.ts',
      provider: 'github', kind: 'file', title: 'index.ts', summary: 'foo',
      score: 80, metrics: { stars: 100 },
      links: { html: 'https://github.com/foo/bar' },
      timestamps: { published: null, updated: new Date().toISOString() },
      evidence: [{ snippet: 'const x = 1' }],
      attribution: { source: 'github', method: 'api' },
    },
  ]),
}))

import { handleFalcon } from '../src/tools/falcon.js'

describe('handleFalcon', () => {
  it('calls search and returns formatted JSON', async () => {
    const result = await handleFalcon({ query: 'typescript retry' })
    expect(result.isError).toBe(false)
    const data = JSON.parse(result.content[0].text)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].id).toBe('github:file:foo/bar/index.ts')
  })

  it('returns error on missing query', async () => {
    const result = await handleFalcon({})
    expect(result.isError).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/mcp && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../src/tools/falcon.js'`

- [ ] **Step 3: Implement tools/falcon.ts**

```typescript
// packages/mcp/src/tools/falcon.ts
import { search } from '@archdruid/core'
import type { SearchOptions } from '@archdruid/core'

interface FalconArgs {
  query?: unknown
  sources?: unknown
  language?: unknown
  max_results?: unknown
  from_date?: unknown
  to_date?: unknown
}

export async function handleFalcon(args: FalconArgs): Promise<{ isError: boolean; content: { type: string; text: string }[] }> {
  if (!args.query || typeof args.query !== 'string') {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Missing required parameter: query' }],
    }
  }

  const opts: SearchOptions = {}

  if (Array.isArray(args.sources)) opts.sources = args.sources as SearchOptions['sources']
  if (typeof args.language === 'string') opts.language = args.language
  if (typeof args.max_results === 'number') opts.maxResults = args.max_results

  if (typeof args.from_date === 'string') {
    opts.dateRange = {
      from: new Date(args.from_date),
      to: typeof args.to_date === 'string' ? new Date(args.to_date) : undefined,
    }
  }

  const results = await search(args.query, opts)
  return {
    isError: false,
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
  }
}

export const falconDefinition = {
  name: 'falcon',
  description: 'Search GitHub, arXiv, Stack Overflow, and Reddit for code examples, research papers, and developer discussions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query:       { type: 'string', description: 'Search terms' },
      sources:     { type: 'array', items: { type: 'string', enum: ['github', 'arxiv', 'stackoverflow', 'reddit'] }, description: 'Subset of sources to search' },
      language:    { type: 'string', description: 'Filter by programming language' },
      max_results: { type: 'number', description: '1–50, default from config' },
      from_date:   { type: 'string', description: 'ISO 8601 date e.g. "2025-12-01"' },
      to_date:     { type: 'string', description: 'ISO 8601 date, default today' },
    },
    required: ['query'],
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/mcp && pnpm test -- --reporter=verbose
```

Expected: falcon tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/tools/falcon.ts packages/mcp/tests/falcon.test.ts
git commit -m "feat(mcp): falcon tool — search handler + MCP definition"
```

---

### Task 13: MCP pouch Tool

**Files:**
- Create: `packages/mcp/src/tools/pouch.ts`
- Create: `packages/mcp/tests/pouch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/mcp/tests/pouch.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@archdruid/core', () => ({
  getContent: vi.fn().mockResolvedValue({
    id: 'github:file:foo/bar/index.ts',
    provider: 'github', kind: 'file', title: 'index.ts', summary: 'foo',
    content: '// full file content here',
    score: 80, metrics: { stars: 100 },
    links: { html: 'https://github.com/foo/bar' },
    timestamps: { published: null, updated: new Date().toISOString() },
    evidence: [], attribution: { source: 'github', method: 'api' },
  }),
}))

import { handlePouch } from '../src/tools/pouch.js'

describe('handlePouch', () => {
  it('returns full content for a valid id', async () => {
    const result = await handlePouch({ id: 'github:file:foo/bar/index.ts' })
    expect(result.isError).toBe(false)
    const data = JSON.parse(result.content[0].text)
    expect(data.content).toBe('// full file content here')
  })

  it('returns error on missing id', async () => {
    const result = await handlePouch({})
    expect(result.isError).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tal/archdruid-mcp/packages/mcp && pnpm test -- --reporter=verbose 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL — `Cannot find module '../src/tools/pouch.js'`

- [ ] **Step 3: Implement tools/pouch.ts**

```typescript
// packages/mcp/src/tools/pouch.ts
import { getContent } from '@archdruid/core'

interface PouchArgs {
  id?: unknown
}

export async function handlePouch(args: PouchArgs): Promise<{ isError: boolean; content: { type: string; text: string }[] }> {
  if (!args.id || typeof args.id !== 'string') {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Missing required parameter: id' }],
    }
  }

  try {
    const result = await getContent(args.id)
    return {
      isError: false,
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Failed to fetch content: ${(err as Error).message}` }],
    }
  }
}

export const pouchDefinition = {
  name: 'pouch',
  description: 'Fetch the full content of a result returned by falcon. Use to read a complete file, paper abstract, or thread.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Result ID from a previous falcon call' },
    },
    required: ['id'],
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/Tal/archdruid-mcp/packages/mcp && pnpm test -- --reporter=verbose
```

Expected: all mcp tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/tools/pouch.ts packages/mcp/tests/pouch.test.ts
git commit -m "feat(mcp): pouch tool — content fetch handler + MCP definition"
```

---

### Task 14: MCP stdio Server Entry

**Files:**
- Create: `packages/mcp/src/index.ts`

- [ ] **Step 1: Implement the stdio MCP server**

```typescript
// packages/mcp/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { falconDefinition, handleFalcon } from './tools/falcon.js'
import { pouchDefinition, handlePouch } from './tools/pouch.js'

const server = new Server(
  { name: 'archdruid', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [falconDefinition, pouchDefinition],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (name === 'falcon') return handleFalcon(args ?? {})
  if (name === 'pouch')  return handlePouch(args ?? {})

  return {
    isError: true,
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
  }
})

export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
```

- [ ] **Step 2: Build the MCP package**

```bash
cd /Users/Tal/archdruid-mcp/packages/mcp && pnpm build
```

Expected: `dist/` created, no type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/mcp/src/index.ts
git commit -m "feat(mcp): stdio server — registers falcon + pouch tools"
```

---

### Task 15: Web App Scaffold

**Files:**
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/app/globals.css`

- [ ] **Step 1: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "jsx": "preserve",
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@archdruid/core'],
}

export default nextConfig
```

- [ ] **Step 3: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:  '#0a0818',
          mid:   '#130d2e',
          upper: '#0e1225',
        },
        accent: {
          purple: '#a78bfa',
          blue:   '#60a5fa',
        },
        source: {
          github: '#f97316',
          arxiv:  '#a78bfa',
          so:     '#facc15',
          reddit: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '20px',
      },
    },
  },
}

export default config
```

- [ ] **Step 4: Create apps/web/app/globals.css**

```css
@import "tailwindcss";

:root {
  --bg-base:     #0a0818;
  --bg-mid:      #130d2e;
  --bg-upper:    #0e1225;
  --glass-bg:    rgba(255,255,255,0.05);
  --glass-border:rgba(255,255,255,0.08);
  --accent-purple:#a78bfa;
  --accent-blue:  #60a5fa;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: linear-gradient(135deg, var(--bg-base), var(--bg-mid), var(--bg-upper));
  min-height: 100vh;
  font-family: Inter, system-ui, sans-serif;
  color: rgba(255,255,255,0.9);
  font-size: 14px;
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
}

.glow-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}
```

- [ ] **Step 5: Verify Next.js can resolve the app**

```bash
cd /Users/Tal/archdruid-mcp/apps/web && pnpm install && pnpm build 2>&1 | tail -20
```

Expected: build completes (may show "no pages" warning — that's fine).

- [ ] **Step 6: Commit**

```bash
git add apps/web/tsconfig.json apps/web/next.config.ts apps/web/tailwind.config.ts apps/web/app/globals.css
git commit -m "feat(web): Next.js scaffold + Tailwind v4 with deep purple design tokens"
```

---

### Task 16: Web Layout + Sidebar

**Files:**
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
// apps/web/components/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',         label: 'Search',  icon: '🔍' },
  { href: '/sources',  label: 'Sources', icon: '⚡' },
  { href: '/connect',  label: 'Connect', icon: '🔌' },
  { href: '/history',  label: 'History', icon: '📋' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="glass flex flex-col gap-1 p-4 w-52 min-h-screen fixed left-0 top-0 z-10">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-xl font-bold bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent">
          Archdruid
        </span>
      </div>
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-all ${
              active
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/05'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </aside>
  )
}
```

- [ ] **Step 2: Create layout.tsx**

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '../components/Sidebar'

export const metadata: Metadata = {
  title: 'Archdruid',
  description: 'Local MCP server for developer knowledge retrieval',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="glow-orb w-96 h-96 bg-[#7c3aed] top-[-100px] left-[-100px]" />
        <div className="glow-orb w-80 h-80 bg-[#2563eb] bottom-[-80px] right-[-80px]" />
        <Sidebar />
        <main className="ml-52 p-8 min-h-screen relative z-1">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Build to check for type errors**

```bash
cd /Users/Tal/archdruid-mcp/apps/web && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/components/Sidebar.tsx
git commit -m "feat(web): root layout + glass sidebar navigation"
```

---

### Task 17: Web API Routes

**Files:**
- Create: `apps/web/app/api/search/route.ts`
- Create: `apps/web/app/api/content/[id]/route.ts`
- Create: `apps/web/app/api/sources/route.ts`
- Create: `apps/web/app/api/sources/[name]/route.ts`
- Create: `apps/web/app/api/history/route.ts`

- [ ] **Step 1: Create apps/web/app/api/search/route.ts**

```typescript
// apps/web/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { search } from '@archdruid/core'
import type { SearchOptions } from '@archdruid/core'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { query: string; options?: SearchOptions }
    if (!body.query) return NextResponse.json({ error: 'query required' }, { status: 400 })
    const results = await search(body.query, body.options)
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create apps/web/app/api/content/[id]/route.ts**

```typescript
// apps/web/app/api/content/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getContent } from '@archdruid/core'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await getContent(decodeURIComponent(id))
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 })
  }
}
```

- [ ] **Step 3: Create apps/web/app/api/sources/route.ts**

```typescript
// apps/web/app/api/sources/route.ts
import { NextResponse } from 'next/server'
import { loadConfig } from '@archdruid/core'

export async function GET() {
  const cfg = await loadConfig()
  return NextResponse.json(cfg.sources)
}
```

- [ ] **Step 4: Create apps/web/app/api/sources/[name]/route.ts**

```typescript
// apps/web/app/api/sources/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { loadConfig, saveConfig } from '@archdruid/core'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const body = await req.json() as Record<string, unknown>
    const cfg = await loadConfig()
    const sources = cfg.sources as Record<string, Record<string, unknown>>
    if (!sources[name]) return NextResponse.json({ error: 'Unknown source' }, { status: 404 })
    sources[name] = { ...sources[name], ...body }
    await saveConfig(cfg)
    return NextResponse.json(sources[name])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 5: Create apps/web/app/api/history/route.ts**

```typescript
// apps/web/app/api/history/route.ts
import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { historyPath } from '@archdruid/core'

export async function GET() {
  try {
    const raw = await readFile(historyPath(), 'utf8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json([])
  }
}
```

Note: `historyPath` must be exported from `@archdruid/core`. Add it to `packages/core/src/index.ts`:

```typescript
export { loadConfig, saveConfig, defaultConfig, historyPath } from './config.js'
```

- [ ] **Step 6: Build to check for errors**

```bash
cd /Users/Tal/archdruid-mcp/apps/web && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/ packages/core/src/index.ts
git commit -m "feat(web): API routes — search, content, sources, history"
```

---

### Task 18: Web Search Page

**Files:**
- Create: `apps/web/components/SearchBar.tsx`
- Create: `apps/web/components/SourceBadge.tsx`
- Create: `apps/web/components/ResultCard.tsx`
- Create: `apps/web/app/page.tsx`

- [ ] **Step 1: Create components/SourceBadge.tsx**

```tsx
// apps/web/components/SourceBadge.tsx
const COLORS: Record<string, string> = {
  github:        'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
  arxiv:         'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/30',
  stackoverflow: 'bg-[#facc15]/20 text-[#facc15] border-[#facc15]/30',
  reddit:        'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
}

export function SourceBadge({ provider }: { provider: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${COLORS[provider] ?? 'bg-white/10 text-white/60 border-white/20'}`}>
      {provider}
    </span>
  )
}
```

- [ ] **Step 2: Create components/SearchBar.tsx**

```tsx
// apps/web/components/SearchBar.tsx
'use client'
import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading?: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (query.trim()) onSearch(query.trim()) }}
      className="flex gap-3"
    >
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search GitHub, arXiv, Stack Overflow, Reddit…"
        className="flex-1 glass px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#a78bfa]/50 transition-colors"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="px-6 py-3 rounded-[12px] bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create components/ResultCard.tsx**

```tsx
// apps/web/components/ResultCard.tsx
import type { Result } from '@archdruid/core'
import { SourceBadge } from './SourceBadge'

interface ResultCardProps {
  result: Result
  onFetchContent?: (id: string) => void
}

export function ResultCard({ result, onFetchContent }: ResultCardProps) {
  const date = result.timestamps.updated
    ? new Date(result.timestamps.updated).toLocaleDateString()
    : '—'

  return (
    <div className="glass p-5 flex flex-col gap-3 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SourceBadge provider={result.provider} />
            <span className="text-white/40 text-xs">{date}</span>
            {result.metrics.stars != null && (
              <span className="text-white/40 text-xs">★ {result.metrics.stars.toLocaleString()}</span>
            )}
          </div>
          <a
            href={result.links.html}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-white hover:text-[#a78bfa] transition-colors"
          >
            {result.title}
          </a>
        </div>
        <span className="text-xs text-[#a78bfa] font-medium shrink-0">{result.score}</span>
      </div>
      <p className="text-white/60 text-xs leading-relaxed line-clamp-3">{result.summary}</p>
      {result.evidence[0] && (
        <code className="text-xs bg-white/05 rounded px-2 py-1.5 text-white/50 line-clamp-2">
          {result.evidence[0].snippet}
        </code>
      )}
      {onFetchContent && (
        <button
          onClick={() => onFetchContent(result.id)}
          className="self-start text-xs text-[#60a5fa] hover:underline"
        >
          Fetch full content →
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create app/page.tsx**

```tsx
// apps/web/app/page.tsx
'use client'
import { useState } from 'react'
import { SearchBar } from '../components/SearchBar'
import { ResultCard } from '../components/ResultCard'
import type { Result } from '@archdruid/core'

export default function SearchPage() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(query: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json() as Result[]
      setResults(data)
    } catch {
      setError('Search failed. Check that providers are configured.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">Search</h1>
        <p className="text-white/40 text-sm">Query GitHub, arXiv, Stack Overflow, and Reddit</p>
      </div>
      <SearchBar onSearch={handleSearch} loading={loading} />
      {error && <p className="text-[#ef4444] text-sm">{error}</p>}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-white/40 text-xs">{results.length} results</p>
          {results.map(r => <ResultCard key={r.id} result={r} />)}
        </div>
      )}
      {!loading && results.length === 0 && (
        <p className="text-white/20 text-sm text-center mt-16">Enter a query to search developer sources</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Build to verify**

```bash
cd /Users/Tal/archdruid-mcp/apps/web && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/
git commit -m "feat(web): Search page — search bar, result cards, source badges"
```

---

### Task 19: Web Sources Page

**Files:**
- Create: `apps/web/app/sources/page.tsx`

- [ ] **Step 1: Create apps/web/app/sources/page.tsx**

```tsx
// apps/web/app/sources/page.tsx
'use client'
import { useEffect, useState } from 'react'
import type { SourceConfig } from '@archdruid/core'

const SOURCE_META = {
  github:        { label: 'GitHub',         color: '#f97316', note: 'Required for code search. Get a token at github.com/settings/tokens' },
  arxiv:         { label: 'arXiv',          color: '#a78bfa', note: 'Public API · No rate limits' },
  stackoverflow: { label: 'Stack Overflow', color: '#facc15', note: 'Works without a key. Key raises rate limits.' },
  reddit:        { label: 'Reddit',         color: '#ef4444', note: 'Requires a Reddit app. Create one at reddit.com/prefs/apps' },
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceConfig | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sources').then(r => r.json()).then(setSources)
  }, [])

  async function update(name: string, patch: Record<string, unknown>) {
    setSaving(name)
    await fetch(`/api/sources/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await fetch('/api/sources').then(r => r.json())
    setSources(updated)
    setSaving(null)
  }

  if (!sources) return <p className="text-white/40 text-sm">Loading…</p>

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">Sources</h1>
        <p className="text-white/40 text-sm">Toggle data sources and manage API credentials</p>
      </div>
      {(Object.keys(sources) as (keyof SourceConfig)[]).map(name => {
        const meta = SOURCE_META[name]
        const src = sources[name] as Record<string, unknown>
        return (
          <div key={name} className="glass p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                <span className="font-medium text-white">{meta.label}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => update(name, { enabled: !src.enabled })}
                  className={`w-10 h-5 rounded-full transition-colors ${src.enabled ? 'bg-[#a78bfa]' : 'bg-white/10'} relative`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${src.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-white/60">{src.enabled ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>
            <p className="text-white/40 text-xs">{meta.note}</p>
            {'token' in src && (
              <input
                placeholder="GitHub personal access token"
                defaultValue={String(src.token ?? '')}
                onBlur={e => update(name, { token: e.target.value })}
                className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[#a78bfa]/40"
              />
            )}
            {'key' in src && (
              <input
                placeholder="Stack Overflow API key (optional)"
                defaultValue={String(src.key ?? '')}
                onBlur={e => update(name, { key: e.target.value })}
                className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[#facc15]/40"
              />
            )}
            {'clientId' in src && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Client ID"
                  defaultValue={String(src.clientId ?? '')}
                  onBlur={e => update(name, { clientId: e.target.value })}
                  className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none"
                />
                <input
                  placeholder="Client Secret"
                  type="password"
                  defaultValue={String(src.clientSecret ?? '')}
                  onBlur={e => update(name, { clientSecret: e.target.value })}
                  className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none"
                />
              </div>
            )}
            {saving === name && <p className="text-white/30 text-xs">Saving…</p>}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/Tal/archdruid-mcp/apps/web && pnpm build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/sources/page.tsx
git commit -m "feat(web): Sources page — toggle + credential management"
```

---

### Task 20: Web Connect Page

**Files:**
- Create: `apps/web/app/connect/page.tsx`

- [ ] **Step 1: Create apps/web/app/connect/page.tsx**

```tsx
// apps/web/app/connect/page.tsx
'use client'
import { useState } from 'react'

const SNIPPETS = [
  {
    editor: 'Claude Code',
    file: '~/.claude/claude_desktop_config.json',
    color: '#a78bfa',
    code: JSON.stringify(
      { mcpServers: { archdruid: { command: 'archdruid', args: ['--mcp'] } } },
      null, 2
    ),
  },
  {
    editor: 'Cursor',
    file: '.cursor/mcp.json',
    color: '#60a5fa',
    code: JSON.stringify(
      { mcpServers: { archdruid: { command: 'archdruid', args: ['--mcp'] } } },
      null, 2
    ),
  },
  {
    editor: 'VS Code',
    file: '.vscode/settings.json',
    color: '#34d399',
    code: JSON.stringify(
      { 'mcp.servers': { archdruid: { command: 'archdruid', args: ['--mcp'] } } },
      null, 2
    ),
  },
]

export default function ConnectPage() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">Connect</h1>
        <p className="text-white/40 text-sm">Add Archdruid to your editor in one step</p>
      </div>
      <div className="glass p-4 text-sm text-white/60">
        <p className="mb-2 font-medium text-white">Prerequisites</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Install Archdruid globally: <code className="text-[#a78bfa]">npm install -g archdruid</code></li>
          <li>Verify: <code className="text-[#a78bfa]">archdruid --version</code></li>
        </ol>
      </div>
      {SNIPPETS.map(s => (
        <div key={s.editor} className="glass p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-white">{s.editor}</span>
              <span className="ml-2 text-white/30 text-xs">{s.file}</span>
            </div>
            <button
              onClick={() => copy(s.code, s.editor)}
              style={{ borderColor: `${s.color}40`, color: s.color }}
              className="text-xs border px-3 py-1 rounded-pill hover:opacity-80 transition-opacity"
            >
              {copied === s.editor ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs bg-black/20 rounded-[8px] p-3 text-white/60 overflow-x-auto">{s.code}</pre>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/connect/page.tsx
git commit -m "feat(web): Connect page — editor config snippets with one-click copy"
```

---

### Task 21: Web History Page

**Files:**
- Create: `apps/web/app/history/page.tsx`

- [ ] **Step 1: Create apps/web/app/history/page.tsx**

```tsx
// apps/web/app/history/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { SourceBadge } from '../../components/SourceBadge'
import type { HistoryEntry } from '@archdruid/core'

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then((data: HistoryEntry[]) =>
      setEntries([...data].reverse())
    )
  }, [])

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">History</h1>
        <p className="text-white/40 text-sm">Recent search queries (last 200)</p>
      </div>
      {entries.length === 0 && (
        <p className="text-white/20 text-sm text-center mt-16">No history yet — run a search to get started</p>
      )}
      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <div key={i} className="glass px-5 py-4 flex items-center gap-4">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-sm text-white font-medium truncate">{entry.query}</span>
              <div className="flex items-center gap-2">
                {entry.sources.map(s => <SourceBadge key={s} provider={s} />)}
                <span className="text-white/30 text-xs">{entry.resultCount} results</span>
                <span className="text-white/30 text-xs">{entry.durationMs}ms</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-white/20 text-xs">{new Date(entry.timestamp).toLocaleDateString()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${entry.calledFrom === 'mcp' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'bg-white/10 text-white/40'}`}>
                {entry.calledFrom}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/history/page.tsx
git commit -m "feat(web): History page — query log with source badges and caller attribution"
```

---

### Task 22: CLI Entry Point

**Files:**
- Create: `bin/archdruid.mjs`
- Modify: `package.json` (root)

- [ ] **Step 1: Create bin/archdruid.mjs**

```javascript
#!/usr/bin/env node
// bin/archdruid.mjs
import { argv } from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (argv.includes('--version') || argv.includes('-v')) {
  const require = createRequire(import.meta.url)
  const pkg = require(join(__dirname, '..', 'package.json'))
  console.log(pkg.version)
  process.exit(0)
}

if (argv.includes('--mcp')) {
  const { startMcpServer } = await import('../packages/mcp/dist/index.js')
  await startMcpServer()
} else {
  // Start the Next.js web server
  const { default: next } = await import('next')
  const app = next({ dev: false, dir: join(__dirname, '..', 'apps', 'web') })
  const handle = app.getRequestHandler()
  await app.prepare()

  const { createServer } = await import('node:http')
  const server = createServer((req, res) => handle(req, res))
  const PORT = parseInt(process.env.PORT ?? '3131', 10)
  server.listen(PORT, () => {
    console.log(`Archdruid running at http://localhost:${PORT}`)
  })
}
```

- [ ] **Step 2: Update root package.json to add bin + version**

Update `package.json`:

```json
{
  "name": "archdruid",
  "version": "0.1.0",
  "description": "Local MCP server for developer knowledge retrieval",
  "private": false,
  "bin": {
    "archdruid": "./bin/archdruid.mjs"
  },
  "files": ["bin/", "packages/*/dist/", "apps/web/.next/"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "start": "node bin/archdruid.mjs"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 3: Make binary executable and verify it runs**

```bash
chmod +x /Users/Tal/archdruid-mcp/bin/archdruid.mjs
cd /Users/Tal/archdruid-mcp && node bin/archdruid.mjs --version
```

Expected: `0.1.0`

- [ ] **Step 4: Commit**

```bash
git add bin/archdruid.mjs package.json
git commit -m "feat: CLI entry point — archdruid (web) + archdruid --mcp (stdio server)"
```

---

### Task 23: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# Archdruid

> A local MCP server that gives AI coding agents fresh, provenance-tracked knowledge from GitHub, arXiv, Stack Overflow, and Reddit — directly inside your editor.

![Archdruid Web UI](docs/screenshot.png)

## Overview

Archdruid is a developer knowledge retrieval tool that runs entirely on your machine. It exposes two MCP tools — `falcon` (search) and `pouch` (fetch content) — that Claude Code, Cursor, and VS Code can call automatically during coding sessions. A full-featured web UI lets you run searches, manage API credentials, and review query history without leaving your browser.

**Who it's for:** Developers who use AI coding assistants and want them to have access to current, real-world code examples and documentation beyond the model's training cutoff.

## Features & Use Cases

- **`falcon` tool** — Search up to 4 sources in parallel with a single query. Supports source filtering, language filters, star count minimums, and configurable date ranges.
- **`pouch` tool** — Fetch the full content of any result returned by `falcon` (complete file, paper abstract, or thread).
- **Date filtering** — Results are limited to the last N months by default (configurable). Override per-call with `from_date` / `to_date`.
- **Source toggling** — Enable/disable any source without changing code.
- **Provenance tracking** — Every result carries its source, method (API vs. headless), and attribution.
- **History log** — All queries are logged locally with timing and caller attribution.

**Example prompts once connected:**
```
Use falcon to find TypeScript retry pattern examples from the last 6 months
Use pouch to get the full content of the top result
Search arXiv for transformer attention papers from 2024
```

## Installation & Configuration

### Install globally

```bash
npm install -g archdruid
```

### Run without installing

```bash
npx archdruid
```

### First run

On first run, Archdruid creates `~/.archdruid/config.json` and opens the web UI at `http://localhost:3131`. Add your API credentials in the **Sources** tab.

### Config file reference

`~/.archdruid/config.json`:

```json
{
  "sources": {
    "github":        { "enabled": true,  "token": "ghp_..." },
    "arxiv":         { "enabled": true },
    "stackoverflow": { "enabled": true,  "key": "" },
    "reddit":        { "enabled": false, "clientId": "", "clientSecret": "" }
  },
  "defaults": {
    "maxResults": 20,
    "dateFilter": {
      "enabled": true,
      "lookbackMonths": 6,
      "allowOverride": true
    }
  }
}
```

## Using Archdruid

### Web UI

```bash
archdruid          # opens http://localhost:3131
```

- **Search** — run queries, filter by source, fetch full content
- **Sources** — toggle sources, enter credentials
- **Connect** — copy editor config snippets
- **History** — review past queries

### Connecting editors

**Claude Code** — `~/.claude/claude_desktop_config.json`:
```json
{ "mcpServers": { "archdruid": { "command": "archdruid", "args": ["--mcp"] } } }
```

**Cursor** — `.cursor/mcp.json`:
```json
{ "mcpServers": { "archdruid": { "command": "archdruid", "args": ["--mcp"] } } }
```

**VS Code** — `.vscode/settings.json`:
```json
{ "mcp.servers": { "archdruid": { "command": "archdruid", "args": ["--mcp"] } } }
```

### Using falcon + pouch from your editor

Once connected, your AI assistant can call:
- `falcon(query, sources?, language?, max_results?, from_date?, to_date?)`
- `pouch(id)` — where `id` comes from a previous `falcon` call

## Architecture Overview

```
archdruid (CLI)
├── --mcp  →  @archdruid/mcp (stdio transport)
│              ├── falcon tool  →  @archdruid/core search()
│              └── pouch tool   →  @archdruid/core getContent()
└── (default)  →  apps/web (Next.js, port 3131)
                   └── /api/*  →  @archdruid/core

@archdruid/core
├── search()     — fans out to 4 providers in parallel
├── getContent() — fetches full content by result ID
├── config       — ~/.archdruid/config.json
├── cache        — in-session result cache (Map)
└── providers/
    ├── github        (@octokit/rest)
    ├── arxiv         (Atom feed, fast-xml-parser)
    ├── stackoverflow (Stack Exchange API v2.3)
    └── reddit        (OAuth2 client credentials)
```

Data flow: `editor prompt → falcon → parallel provider queries → scored results → pouch → full content`

## Troubleshooting

**MCP server not detected by editor**
- Verify `archdruid` is in PATH: `which archdruid`
- Test the server directly: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | archdruid --mcp`
- Restart your editor after adding the config snippet

**Rate limit / API key errors**
- GitHub: generate a personal access token at github.com/settings/tokens (needs `public_repo` scope)
- Stack Overflow: a key raises the hourly limit from 300 to 10,000 requests
- Check the Sources page — a red status indicator means the last call failed

**Reddit credential setup**
1. Go to reddit.com/prefs/apps
2. Create a "script" type app
3. Copy the Client ID (under the app name) and Client Secret
4. Paste both into the Sources page

**Stale or missing results**
- Increase `lookbackMonths` in config, or pass `from_date: "2020-01-01"` to override
- GitHub code search indexes with up to 24 hours delay for new files

## Limitations

- **Local-only** — no cloud sync, no team sharing, no remote access
- **Reddit requires credentials** — Reddit's API requires a registered app
- **No semantic search** — ranking is keyword relevance + recency; no vector embeddings
- **arXiv abstracts only** — full PDFs are not fetched
- **Session-scoped cache** — hash-based result IDs from a previous session resolve via URL re-fetch, which adds one extra API call

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README — overview, features, install, usage, architecture, troubleshooting"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by task |
|---|---|
| pnpm monorepo + Turborepo | Task 1 |
| `types.ts` — Result, SearchOptions, Config, HistoryEntry | Task 2 |
| `config.ts` — read/write `~/.archdruid/config.json`, history.json | Task 3 |
| ID generation — structured + SHA-256 hash fallback | Task 4 |
| In-session result cache | Task 4 |
| Relevance scorer 0–100 | Task 5 |
| GitHub provider (`@octokit/rest`, date range) | Task 6 |
| arXiv provider (Atom feed, `fast-xml-parser`) | Task 7 |
| Stack Overflow provider (SE API v2.3) | Task 8 |
| Reddit provider (OAuth2 client credentials) | Task 9 |
| `search()` — parallel fan-out, date filter, history log | Task 10 |
| `getContent()` — fetch full content by ID | Task 11 |
| `falcon` MCP tool definition + handler | Task 12 |
| `pouch` MCP tool definition + handler | Task 13 |
| stdio MCP server | Task 14 |
| Next.js 15 scaffold, Tailwind v4, design tokens | Task 15 |
| Root layout + glass sidebar | Task 16 |
| All 5 API routes | Task 17 |
| Search page | Task 18 |
| Sources page (toggle, credentials, arXiv no-token) | Task 19 |
| Connect page (3 editor snippets, copy button) | Task 20 |
| History page | Task 21 |
| CLI entry — `archdruid` + `archdruid --mcp` | Task 22 |
| README with all required sections | Task 23 |

All spec requirements are covered.
