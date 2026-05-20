# Differ

Agents write code faster than humans can review. Differ gives humans system-level comprehension so they can oversee the work done by AI agents.

## The Problem

A single AI agent session can touch dozens of files across multiple system boundaries in minutes. Traditional code review assumes humans wrote the code incrementally and can inspect most lines — that assumption is breaking. The bottleneck is no longer writing code, it's maintaining comprehension of how your system is changing.

## How Differ Solves It

Differ introduces a **topology layer** — a named graph of system components and their relationships — and uses it to translate raw file changes into structural, system-level understanding.

Three modes serve different moments in the oversight loop:

- **Watch** — Live structural monitoring. See which parts of your system agents are touching, in real-time. Mission control for active development.
- **Analyze** — AI-powered semantic analysis. Understand *why* changes were made, what decisions were taken, and what's at risk. Runs at session boundaries.
- **Review** — Decision checkpoint for PRs. Architecture-aware review that organizes changes by intent and design choices, not by file.

## Who It's For

Developers and tech leads who use AI agents to write code and need to maintain architectural oversight without reading every diff.
