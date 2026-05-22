# Differ

Live structural monitoring for codebases — topology first, code second.

Differ watches your file changes in real-time, maps them to architectural components, and renders an interactive graph showing what's changing and what's affected. Built for developers using AI agents who need to maintain system-level awareness without reading every diff.

## Prerequisites

- Node.js 20+

## Install

```bash
git clone <repo-url> && cd differ
npm install && npm run build
npm link
```

## Usage

```bash
cd your-project
differ watch
```

Opens a live topology view at `http://localhost:3141`.

### Options

```bash
differ watch                     # defaults: base=origin/main, port=3141
differ watch -b main             # custom base ref
differ watch -p 8080             # custom port
differ watch --debounce 2000     # custom debounce (ms)
differ watch --fresh             # start a fresh session
```

## How It Works

1. Watches your working directory for file changes
2. Captures git diffs and maps changed files to topology nodes
3. For React projects, uses AST analysis to detect components, hooks, routes, and their relationships
4. Computes blast radius — what else might be affected by your changes
5. Pushes updates to the browser via SSE
6. Renders an interactive graph (React Flow) with diff details on click

## Development

```bash
npm run dev      # rebuild on file change
npm test         # run tests
npm run build    # production build
```

## License

ISC
