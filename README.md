# Differ

Systems-level code review — topology first, code second.

Differ maps your git changes to architectural components, uses Claude AI to generate semantic analysis, and renders interactive reviews with topology graphs. See what changed, what it means, and what else is affected.

## Prerequisites

- **Node.js 20+**
- **Claude CLI** — install from [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) and authenticate with `claude login`

## Install

```bash
npm install -g differ
```

Or for contributors:

```bash
git clone <repo-url> && cd differ
npm install && npm run build
npm link
```

## Quick Start

```bash
cd your-repo
differ
```

That's it. On first run, Differ:

1. Creates a `.differ/` directory (git-ignored, never committed)
2. Auto-scaffolds a topology from your repo structure
3. Analyzes your recent changes with Claude
4. Opens an interactive review server

## Personal Mode

The bare `differ` command is your personal review companion. Everything stays local in `.differ/`:

```
.differ/
├── .gitignore          # contains "*" — nothing escapes
├── topology.json       # your draft system map
├── SYSTEM_DELTA.json   # latest analysis
└── sessions/           # (future) change history
```

### Options

```bash
differ                          # review changes since last commit
differ -b main                  # review all changes since main
differ -b HEAD~3                # review last 3 commits
differ -i "adding auth flow"    # hint about intent (improves analysis)
differ -m opus                  # use a different Claude model
differ -p 8080                  # custom port
```

### Promoting Your Topology

When your topology is refined and ready for team use:

```bash
differ init --promote
```

This copies `.differ/topology.json` to the repo root where CI and teammates can use it.

## Team / PR Mode

For team-visible reviews, commit `topology.json` to your repo root and use the explicit commands:

```bash
# Generate semantic analysis (commit the output for CI)
differ analyze -b origin/main

# Generate static HTML review
differ review -b origin/main -o review.html

# Live server with topology chat editing
differ serve -b origin/main
```

### GitHub Actions

Add the included workflow (`.github/workflows/differ-review.yml`) to auto-post reviews on PRs. It requires `topology.json` and `SYSTEM_DELTA.json` committed to the repo.

The workflow:
- Generates an interactive `review.html` artifact
- Posts a structured comment on the PR with intent, changed nodes, blast radius, and design decisions

## Commands

| Command | Description |
|---------|-------------|
| `differ` | Personal review — analyze + live server |
| `differ analyze` | Generate SYSTEM_DELTA.json from git diff |
| `differ review` | Generate static HTML review |
| `differ serve` | Live server with topology chat |
| `differ init` | Scaffold topology.json from repo structure |
| `differ init --promote` | Move personal topology to repo root |

## topology.json

A topology defines your system's components and their relationships:

```json
{
  "nodes": [
    {
      "id": "AuthService",
      "type": "service",
      "files": ["src/auth/**"],
      "description": "Handles authentication and session management"
    },
    {
      "id": "ApiGateway",
      "type": "service",
      "files": ["src/gateway/**"],
      "description": "HTTP routing and request validation"
    }
  ],
  "edges": [
    { "from": "ApiGateway", "to": "AuthService", "type": "calls" }
  ]
}
```

**Nodes** represent architectural components. The `files` array uses glob patterns to map code to nodes.

**Edges** describe relationships: `calls`, `depends`, `emits`, `subscribes`.

Differ uses this map to answer: "given these file changes, which components were affected and what else might break?"

## Configuration

### Claude Model

Default is `sonnet`. Override per-run with `-m`:

```bash
differ -m opus      # more thorough analysis
differ -m haiku     # faster, lighter
```

### Base Ref

Personal mode defaults to `HEAD~1`. Override with `-b`:

```bash
differ -b origin/main    # everything since diverging from main
differ -b HEAD~5         # last 5 commits
differ -b abc1234        # since a specific commit
```

## License

ISC
