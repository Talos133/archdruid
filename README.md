# Archdruid

> A local MCP server that gives AI coding agents fresh, provenance-tracked knowledge from GitHub, arXiv, Stack Overflow, and Reddit — directly inside your editor.

## Overview

Archdruid is a developer knowledge retrieval tool that runs entirely on your machine. It exposes two MCP tools — `falcon` (search) and `pouch` (fetch content) — that Claude Code, Cursor, and VS Code can call automatically during coding sessions. A full-featured web UI lets you run searches, manage API credentials, and review query history without leaving your browser.

**Who it's for:** Developers who use AI coding assistants and want them to have access to current, real-world code examples and documentation beyond the model's training cutoff.

## Features & Use Cases

- **`falcon` tool** — Search up to 4 sources in parallel with a single query. Supports source filtering, language filters, star count minimums, and configurable date ranges.
- **`pouch` tool** — Fetch the full content of any result returned by `falcon` (complete file, paper abstract, or thread body).
- **Date filtering** — Results limited to the last N months by default (configurable). Override per-call with `from_date` / `to_date`.
- **Source toggling** — Enable/disable any source without changing code. All credentials stay local.
- **Provenance tracking** — Every result carries its source, retrieval method (API vs. headless), and attribution.
- **History log** — All queries logged locally with timing and caller attribution (web vs. MCP).

**Example prompts once connected to your editor:**
```
Use falcon to find TypeScript retry pattern examples from the last 6 months
Use pouch to get the full content of the top result
Search arXiv for transformer attention papers from 2024
Find Stack Overflow questions about React Server Components with high vote counts
```

## Installation & Configuration

### Global install

```bash
npm install -g archdruid
archdruid          # opens http://localhost:3131
archdruid --mcp    # starts the MCP stdio server
```

### Without installing

```bash
npx archdruid
npx archdruid --mcp
```

### First run

On first run, Archdruid creates `~/.archdruid/config.json` with defaults and opens the web UI at `http://localhost:3131`. Go to the **Sources** page to add your API credentials.

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

- **GitHub** — Personal access token with `public_repo` scope. Required for code search.
- **arXiv** — No credentials needed. Public API with no rate limits.
- **Stack Overflow** — Works without a key (300 requests/hour). Add a key for 10,000 requests/hour.
- **Reddit** — Requires a Reddit app. See Troubleshooting for setup steps.

## Using Archdruid

### Web UI

Start the web server:
```bash
archdruid
```

The web UI at `http://localhost:3131` has four pages:

| Page | Purpose |
|---|---|
| **Search** | Run queries, filter by source, fetch full content inline |
| **Sources** | Toggle sources on/off, enter API credentials |
| **Connect** | Copy-paste editor config snippets |
| **History** | Browse past queries with timing and caller attribution |

### Connecting your editor

Add the config snippet for your editor, then restart.

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

Once connected, your AI assistant can call these tools:

**`falcon`** — Search developer sources:
```
falcon(query, sources?, language?, max_results?, from_date?, to_date?)
```

**`pouch`** — Fetch full content of a result:
```
pouch(id)   # id comes from a previous falcon call
```

## Architecture Overview

```
archdruid (CLI)
├── --mcp  →  @archdruid/mcp (stdio MCP transport)
│              ├── falcon  →  @archdruid/core search()
│              └── pouch   →  @archdruid/core getContent()
└── (default)  →  apps/web (Next.js 15, port 3131)
                   └── /api/*  →  @archdruid/core

@archdruid/core
├── search()       parallel fan-out → 4 providers → scored + merged results
├── getContent()   fetch full content by result ID (cache → API → URL fallback)
├── config         ~/.archdruid/config.json
├── cache          in-session result Map (structured ID + SHA-256 hash fallback)
└── providers/
    ├── github        @octokit/rest code search
    ├── arxiv         Atom feed (fast-xml-parser)
    ├── stackoverflow Stack Exchange API v2.3
    └── reddit        OAuth2 client credentials
```

**Data flow:**
`editor prompt → falcon → parallel provider queries → score + merge → results → pouch → full content`

**Result IDs:**
Every result has a stable ID. Preferred form is `provider:kind:key` (e.g. `github:file:owner/repo/path.ts`, `arxiv:paper:2301.07041`). When no stable key is available, a SHA-256 hash of `provider + url + title` produces a 12-char fallback: `github:hash:a3f9b2c10d4e`.

## Troubleshooting

**MCP server not detected by editor**
1. Verify `archdruid` is in PATH: `which archdruid`
2. Test the server directly: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | archdruid --mcp`
3. Restart your editor after adding the config snippet

**Rate limit / API key errors**
- **GitHub**: Generate a token at github.com/settings/tokens — needs `public_repo` scope. Without a token, GitHub search is disabled.
- **Stack Overflow**: A registered app key raises the hourly limit from 300 to 10,000. Add it on the Sources page.
- Check the Sources page for red status indicators — they mean the last API call failed.

**Reddit credential setup**
1. Go to reddit.com/prefs/apps
2. Click "create another app" → choose **script**
3. Fill in any name and redirect URI (`http://localhost`)
4. Copy the **Client ID** (the string under the app name) and **Client Secret**
5. Paste both into the Reddit row on the Sources page

**Stale or missing results**
- Increase `lookbackMonths` in `~/.archdruid/config.json`, or pass `from_date: "2020-01-01"` in your prompt to disable the date filter for one call
- GitHub code search indexes new files with up to 24 hours delay
- arXiv results are sorted by submission date; very new papers may not appear immediately

## Limitations

- **Local-only** — No cloud sync, no team sharing, no remote access
- **Reddit requires credentials** — Reddit's API requires a registered app with `clientId` + `clientSecret`
- **No semantic search** — Ranking is keyword relevance + recency + metrics; no vector embeddings
- **arXiv abstracts only** — Full paper PDFs are not fetched; `pouch` returns the abstract
- **Session-scoped result cache** — Hash-based IDs from a previous session resolve via URL re-fetch (one extra API call), not cache
- **GitHub headless fallback** — When the API rate limit is hit, headless mode is 2-4× slower

## License

MIT
