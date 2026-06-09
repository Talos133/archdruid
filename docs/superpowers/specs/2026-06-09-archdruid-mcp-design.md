# Archdruid MCP Server — Design Spec
**Date:** 2026-06-09  
**Status:** Approved  
**Author:** Tal (Talos133)

---

## Overview

Archdruid is a local MCP (Model Context Protocol) server that gives AI coding agents fresh, provenance-tracked knowledge from the developer sources they trust — GitHub, arXiv, Stack Overflow, and Reddit — directly inside the editor. It runs entirely on the user's machine, requires no cloud account, and exposes two MCP tools (`falcon` and `pouch`) that any MCP-compatible editor can call automatically during a coding session.

It ships as an npm package (`archdruid`) with a full-featured web UI for search, configuration, and editor setup.

---

## Goals

- A complete, public portfolio project that demonstrates full-stack TypeScript, MCP protocol integration, and premium UI design
- Installable via `npm install -g archdruid` or runnable without install via `npx archdruid`
- Plugs into Claude Code, Cursor, and VS Code with a single config snippet per editor
- Visually striking: deep purple glassmorphism design system

---

## Non-Goals

- Cloud hosting, multi-user, or team sharing (local-only by design)
- AI/ML ranking or semantic vector search (keyword + recency scoring only in v1)
- Billing, authentication, or accounts of any kind

---

## Repository Structure

```
archdruid/                         ← GitHub: github.com/Talos133/archdruid (public)
├── packages/
│   ├── core/                      ← @archdruid/core — retrieval engine
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── github.ts
│   │   │   │   ├── arxiv.ts
│   │   │   │   ├── stackoverflow.ts
│   │   │   │   └── reddit.ts
│   │   │   ├── search.ts          ← unified search() — fans out to providers in parallel
│   │   │   ├── content.ts         ← getContent() — full fetch by result ID
│   │   │   ├── config.ts          ← reads/writes ~/.archdruid/config.json
│   │   │   ├── id.ts              ← ID generation + resolution (structured + hash fallback)
│   │   │   └── types.ts           ← shared TypeScript types
│   │   └── package.json
│   └── mcp/                       ← @archdruid/mcp — MCP server
│       ├── src/
│       │   └── index.ts           ← stdio transport, registers falcon + pouch tools
│       └── package.json
└── apps/
    └── web/                       ← Next.js 15 web app
        ├── app/
        │   ├── page.tsx            ← Search page
        │   ├── sources/page.tsx    ← Sources & date defaults
        │   ├── connect/page.tsx    ← Editor connection snippets
        │   ├── history/page.tsx    ← Query history
        │   └── api/
        │       ├── search/route.ts
        │       ├── content/[id]/route.ts
        │       ├── sources/route.ts
        │       └── history/route.ts
        ├── components/
        └── package.json
```

**Toolchain:**
- Runtime: Node.js 20+
- Language: TypeScript throughout
- Monorepo: pnpm workspaces + Turborepo
- Web: Next.js 15 (App Router), Tailwind CSS v4
- MCP SDK: `@modelcontextprotocol/sdk`

---

## `@archdruid/core` — Retrieval Engine

### Public API

```typescript
search(query: string, options?: SearchOptions): Promise<Result[]>
getContent(id: string): Promise<Result>
```

### Types

```typescript
interface SearchOptions {
  sources?:    ('github' | 'arxiv' | 'stackoverflow' | 'reddit')[]
  maxResults?: number                  // default: 20
  language?:   string                  // e.g. "TypeScript" — GitHub filter
  minStars?:   number                  // GitHub only
  dateRange?:  DateRange | 'all'       // 'all' disables the date filter for this call
}

interface DateRange {
  from: Date        // lower bound (inclusive)
  to?:  Date        // upper bound, default: Date.now()
}

interface Result {
  id:         string          // "github:file:owner/repo/path" or "github:hash:a3f9b2c10d4e"
  provider:   'github' | 'arxiv' | 'stackoverflow' | 'reddit'
  kind:       'file' | 'repo' | 'paper' | 'question' | 'post'
  title:      string
  summary:    string
  content?:   string          // populated only by getContent()
  language?:  string
  score:      number          // 0–100 relevance score
  metrics: {
    stars?:     number
    votes?:     number
    citations?: number
    views?:     number
    answers?:   number
  }
  links: {
    html:   string
    raw?:   string
    pdf?:   string
  }
  timestamps: {
    published: Date | null    // original publish date (paper / post / question)
    updated:   Date           // last updated (always present)
  }
  evidence:    { snippet: string; highlight?: string }[]
  attribution: { source: string; method: 'api' | 'headless' }
}
```

### ID Generation

Every result always has an ID. Two tiers:

1. **Structured ID** (preferred): `provider:kind:stable-key`
   - `github:file:sindresorhus/p-retry/index.ts`
   - `arxiv:paper:2301.07041`
   - `stackoverflow:question:11828004`
   - `reddit:post:t3_abc123`

2. **Hash fallback** (headless scrapes or providers with no stable key):
   - `SHA-256(provider + html_url + title)` truncated to 12 chars
   - e.g. `github:hash:a3f9b2c10d4e`
   - Resolved via an in-session result cache; falls back to fetching by `html_url` on cache miss

### Config File

Located at `~/.archdruid/config.json`. Created on first run with empty defaults.

```json
{
  "sources": {
    "github":        { "enabled": true,  "token": "" },
    "arxiv":         { "enabled": true },
    "stackoverflow": { "enabled": true,  "key": "" },
    "reddit":        { "enabled": false, "clientId": "", "clientSecret": "" }
  },
  "defaults": {
    "maxResults": 20,
    "dateFilter": {
      "enabled":       true,
      "lookbackMonths": 6,
      "allowOverride":  true
    }
  }
}
```

**Notes:**
- arXiv has no credentials — the `enabled` flag is the only config field
- Reddit requires both `clientId` and `clientSecret` to enable
- Date filter applies to all sources that support it; sources without date indexing (e.g. arXiv API) receive best-effort filtering on the returned results

**History log:** Stored at `~/.archdruid/history.json` as a JSON array (max 200 entries, oldest dropped on overflow). Each entry records: `query`, `sources`, `resultCount`, `durationMs`, `calledFrom` (`'web'|'mcp'`), `timestamp`.

---

## `@archdruid/mcp` — MCP Server

Transport: **stdio** (standard for local MCP tools)

### Tool: `falcon`

```
Name:        falcon
Description: Search GitHub, arXiv, Stack Overflow, and Reddit for code
             examples, research papers, and developer discussions.

Parameters:
  query        string    required  Search terms
  sources      string[]  optional  Subset of ["github","arxiv","stackoverflow","reddit"]
  language     string    optional  Filter by programming language
  max_results  number    optional  1–50, default from config
  from_date    string    optional  ISO 8601 date string e.g. "2025-12-01"
  to_date      string    optional  ISO 8601 date string, default today

Returns: Result[] (without content field — use pouch to fetch full content)
```

### Tool: `pouch`

```
Name:        pouch
Description: Fetch the full content of a result returned by falcon.
             Use to read a complete file, paper abstract, or thread.

Parameters:
  id           string    required  Result ID from a previous falcon call

Returns: Result with content field populated
```

### Editor Config Snippets

```jsonc
// Claude Code — ~/.claude/claude_desktop_config.json
{ "mcpServers": { "archdruid": { "command": "archdruid", "args": ["--mcp"] } } }

// Cursor — .cursor/mcp.json
{ "mcpServers": { "archdruid": { "command": "archdruid", "args": ["--mcp"] } } }

// VS Code — .vscode/settings.json
{ "mcp.servers": { "archdruid": { "command": "archdruid", "args": ["--mcp"] } } }
```

---

## Web App — Pages & Routes

### Pages (Next.js App Router)

| Route | Page | Purpose |
|---|---|---|
| `/` | Search | falcon search bar, source pills, date filter, result cards with pouch button |
| `/sources` | Sources | Toggle sources, enter API keys, set default date filter |
| `/connect` | Connect | Copy-paste config snippets for Claude Code, Cursor, VS Code |
| `/history` | History | Recent falcon calls with source dots, result count, caller attribution |

### API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/search` | Calls `core.search()`, returns `Result[]` |
| `GET` | `/api/content/[id]` | Calls `core.getContent()`, returns full `Result` |
| `GET` | `/api/sources` | Returns configured sources + status |
| `PATCH` | `/api/sources/[name]` | Update source config (toggle, save key) |
| `GET` | `/api/history` | Returns recent queries from local history log |

### Design System

- **Base**: Deep purple gradient (`#0a0818` → `#130d2e` → `#0e1225`)
- **Glass cards**: `backdrop-filter: blur(16px)`, `background: rgba(255,255,255,0.04–0.06)`
- **Glow orbs**: Radial gradients for atmospheric depth
- **Source colors**:
  - GitHub: `#f97316` (orange)
  - arXiv: `#a78bfa` (purple)
  - Stack Overflow: `#facc15` (yellow)
  - Reddit: `#ef4444` (red)
- **Accent / logo gradient**: `#a78bfa` → `#60a5fa`
- **Font**: Inter (system-ui fallback), 14px base, 22px headings
- **Border radius**: 12–14px cards, 20px pills

---

## Installation & Distribution

```bash
# Global install
npm install -g archdruid
archdruid          # → web UI at http://localhost:3131
archdruid --mcp    # → stdio MCP server

# Without installing
npx archdruid
npx archdruid --mcp
```

On first run: creates `~/.archdruid/config.json` and opens the web UI at `http://localhost:3131`.

**Release artifacts:**

| Artifact | Location |
|---|---|
| `archdruid` npm package | npmjs.com/package/archdruid |
| Source + docs | github.com/Talos133/archdruid (public) |

---

## README Structure

```
# Archdruid

> One-line description

[Screenshot of web UI]

## Overview
   — What it is, why it exists, who it's for

## Features & Use Cases
   — falcon + pouch tools, example prompts
   — Date filtering, source toggling, provenance

## Installation & Configuration
   — npm / npx commands
   — First-run web UI setup
   — Config file reference

## Using Archdruid
   — Web UI walkthrough
   — Connecting editors (3 snippets)
   — Using falcon + pouch from your editor

## Architecture Overview
   — Monorepo diagram
   — Data flow: editor → falcon → providers → results

## Troubleshooting
   — MCP server not detected
   — Rate limit / API key errors
   — Reddit credential setup
   — Stale or missing results

## Limitations
   — Local-only (no cloud or team sharing)
   — Reddit requires app credentials
   — No semantic/vector search (keyword + recency only)
   — arXiv results limited to abstracts

## License
```

---

## Limitations (v1)

- **Local-only**: no remote access, no team sharing, no cloud sync
- **Reddit setup friction**: requires creating a Reddit app to get `clientId` + `clientSecret`
- **No semantic search**: ranking is keyword relevance + recency score; no embeddings
- **arXiv**: full paper PDFs are not fetched — abstracts and metadata only
- **Headless fallback latency**: GitHub headless mode (when API rate limit is hit) is 2–4× slower than API mode
- **Result cache is session-scoped**: hash-fallback IDs from a previous session resolve via URL re-fetch, not cache

---

## Open Questions (resolved)

| Question | Decision |
|---|---|
| Deployment model | Local-only |
| Language | TypeScript throughout |
| MCP tool names | `falcon` (search) + `pouch` (get content) |
| Visual style | Deep purple glassmorphism |
| Sources in v1 | GitHub, arXiv, Stack Overflow, Reddit |
| Date filtering | Configurable default + per-call override via `from_date` / `to_date` |
| ID fallback | Structured → SHA-256 hash → URL re-fetch |
