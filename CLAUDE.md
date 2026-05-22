# Differ

Live structural monitoring for codebases. Shows which architectural components are changing in real-time as you (or agents) write code. Topology-first, code-second.

## Quick Reference

```bash
npm install && npm run build   # build
npm link                       # install globally
npm run dev                    # rebuild on change (dev)
npm test                       # vitest
differ watch                   # run in any repo
```

## Tech Stack

- **Runtime:** Node 20+, ESM
- **Server:** Hono + @hono/node-server (SSE for live updates)
- **Client:** React 19, React Flow (@xyflow/react), Zustand
- **Storage:** better-sqlite3 (local `.differ/differ.db`)
- **Build:** tsup (two entries: IIFE browser bundle + ESM CLI)
- **AST:** TypeScript compiler API (for React component detection)

## Architecture

```
src/
├── cli.ts              # Commander entry point (differ watch)
├── watch-server.ts     # Hono server, SSE push, orchestrates everything
├── watcher.ts          # fs.watch debounced file watcher
├── topology.ts         # Directory-based topology (generic repos)
├── react-topology.ts   # React-specific topology (components, hooks, routes)
├── react-ast/          # TS AST analysis for React projects
├── diff.ts             # Git diff parsing, commit capture
├── diff-stats.ts       # Per-node line stats from diffs
├── blast-radius.ts     # Compute affected nodes from edges
├── layout.ts           # Dagre graph layout
├── db/                 # SQLite persistence (events table, timeline)
├── render.ts           # HTML shell served to browser
├── render-css.ts       # Styles
├── render-serve.ts     # Static file serving
└── client/             # React app (browser)
    ├── App.tsx         # Root, SSE subscription
    ├── state.ts        # Zustand store
    └── components/     # GraphView, DiffView, Drawer, NodeDetail, etc.
```

**Data flow:** File change detected → git diff captured → mapped to topology nodes → layout computed → pushed to client via SSE → React Flow renders graph.

## Conventions

- All imports use `.js` extensions (ESM resolution)
- Types co-located with implementation (no separate `types/` barrel exports)
- Server renders full HTML page inline (no separate HTML files)
- Client bundle is IIFE, inlined into the served HTML
- No external config files — everything is CLI flags or convention

## Rules

### Think Before Coding

- State assumptions before implementing. If uncertain, ask.
- If multiple approaches exist, name them and the tradeoff — don't pick silently.
- If something is unclear, stop and ask.

### Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No speculative "flexibility" or "configurability."
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style even if you'd do it differently.
- Every changed line should trace directly to the task.

### Goal-Driven Execution

- Transform tasks into verifiable goals before starting.
- For multi-step work, state a brief plan with verification steps.
- Run `npm run build` to verify compilation after changes.
- Run `npm test` if tests exist for the area you touched.
