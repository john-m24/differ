# Differ — Vision

Where this is headed.

## Watch Mode

Auto-re-analyze as you code. A file-system watcher triggers incremental re-analysis when you save. The live server updates in real time — your topology graph evolves as you work. No manual re-runs needed.

## Session Timeline

Change history over a working day. Each analysis is timestamped and stored in `.differ/sessions/`. Browse how your system evolved during a coding session. Answer "what did I actually accomplish today?" with architectural context, not just a list of files.

## Scope Drift Detection

Stay focused. You state your intent ("refactoring auth middleware") and Differ flags when changes touch unrelated components. A guardrail before you commit — keeps PRs tight and reviewable.

## PR Preview

See the teammate view before pushing. Renders exactly what your reviewer will see in the CI-generated review — locally, before you open the PR. Refine the narrative of your changes before anyone else reads them.

## Multi-Repo Topology

Span service boundaries. Define edges between components in different repositories. Cross-repo blast radius analysis for microservice and monorepo-adjacent architectures. Understand ripple effects across the system, not just within one codebase.
