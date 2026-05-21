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

## Pain Points We're Solving

1. **"I changed X but I don't know what it affects"** — When you modify a node, you need to immediately understand the ripple effects. What depends on this? What will break? The topology graph knows these relationships but the current UX doesn't make them viscerally obvious when you're in the moment.

2. **"I can't keep up with what agents are doing"** — Agents produce changes faster than you can read diffs. You need a compressed, structural view that tells you what's happening without requiring you to read code.

3. **"I don't remember what happened yesterday"** — Change activity is ephemeral. You need a persistent history of how your system evolved — not just git log (which is file-level), but a system-level record of which components were touched, when, and how much.

4. **"I want to ask questions about my system"** — When looking at a node, you should be able to ask: "What depends on this?", "What changed here recently?", "If I modify this, what's at risk?" — and get immediate, contextual answers.

## Next Directions

- **Persistent history (local DB)** — Store all timeline activity durably. Enable queries like "show me everything that happened to Renderer this week" or "when did the system last look different from now?"
- **Interactive node exploration** — Click a node → see everything: its dependencies, dependents, recent change history, blast radius, and an AI agent you can ask questions about its role and relationships.
- **Impact prediction** — Before you (or an agent) touch a node, show what will likely be affected based on topology edges and historical patterns.
