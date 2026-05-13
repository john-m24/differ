import { spawnSync } from "node:child_process";
import type { Topology, SystemDelta } from "./types.js";
import type { FileHunk, NodeDiff } from "./diff.js";

export interface AnalyzeOptions {
  fileDiffs: FileHunk[];
  nodeDiffs: NodeDiff[] | null;
  topology: Topology | null;
  intent?: string;
  model?: string;
  verbose?: boolean;
}

const SYSTEM_PROMPT = `You are a systems-level code analyst. Given a git diff and optionally a system topology, produce a SystemDelta JSON describing WHAT changed at the architecture level, WHY, and WHAT ELSE is affected.

Rules:
- Infer "intent" from the changes if not provided. State it as a concise task description.
- "changed" maps to topology nodes whose files were modified. For each, summarize before/after in one sentence and list structural changes (added/modified/removed functions, types, exports).
- "blast_radius" lists nodes that DEPEND ON or CALL INTO changed nodes (use edges). Do NOT include changed nodes themselves.
- "decision_trace" captures non-trivial design choices visible in the diff.
- "scope_violations" flags changes to nodes not implied by the intent.
- If no topology is provided, leave "changed" empty and focus on intent and decision_trace.
- Use PascalCase for node IDs. Be concise — one sentence per summary.`;

const SYSTEM_DELTA_SCHEMA = {
  type: "object",
  required: [
    "intent",
    "intent_satisfied",
    "changed",
    "added",
    "removed",
    "moved",
    "edges_added",
    "edges_removed",
    "blast_radius",
    "scope_violations",
    "decision_trace",
  ],
  properties: {
    intent: { type: "string" },
    intent_satisfied: { type: "boolean" },
    changed: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "summary", "before", "structural_changes"],
        properties: {
          id: { type: "string" },
          summary: { type: "string" },
          before: { type: "string" },
          structural_changes: { type: "array", items: { type: "string" } },
        },
      },
    },
    added: { type: "array", items: { type: "string" } },
    removed: { type: "array", items: { type: "string" } },
    moved: {
      type: "array",
      items: {
        type: "object",
        required: ["what", "from", "to"],
        properties: {
          what: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
    edges_added: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "type"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          type: {
            type: "string",
            enum: ["calls", "depends", "emits", "subscribes"],
          },
          description: { type: "string" },
        },
      },
    },
    edges_removed: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "type"],
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          type: {
            type: "string",
            enum: ["calls", "depends", "emits", "subscribes"],
          },
          description: { type: "string" },
        },
      },
    },
    blast_radius: { type: "array", items: { type: "string" } },
    scope_violations: { type: "array", items: { type: "string" } },
    decision_trace: {
      type: "array",
      items: {
        type: "object",
        required: ["decision", "alternatives", "rationale"],
        properties: {
          decision: { type: "string" },
          alternatives: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
        },
      },
    },
  },
};

const MAX_DIFF_BYTES = 50_000;
const MAX_HUNK_LINES = 200;

function truncateDiff(fileDiffs: FileHunk[]): string {
  let parts: string[] = [];
  let totalSize = 0;

  for (const fd of fileDiffs) {
    const lines = fd.hunks.split("\n");
    let hunks: string;
    if (lines.length > MAX_HUNK_LINES) {
      hunks =
        lines.slice(0, MAX_HUNK_LINES).join("\n") +
        `\n[truncated — ${lines.length - MAX_HUNK_LINES} more lines]`;
    } else {
      hunks = fd.hunks;
    }

    const entry = `--- ${fd.file} ---\n${hunks}\n`;
    totalSize += entry.length;

    if (totalSize > MAX_DIFF_BYTES) {
      parts.push(
        `--- ${fd.file} ---\n[diff too large — ${lines.length} lines, skipped]\n`
      );
    } else {
      parts.push(entry);
    }
  }

  return parts.join("\n");
}

function buildPrompt(opts: AnalyzeOptions): string {
  const intentSection = opts.intent || "Infer from the diff below.";

  const topologySection = opts.topology
    ? JSON.stringify(opts.topology, null, 2)
    : "No topology available. Skip node mapping.";

  const diffSection = truncateDiff(opts.fileDiffs);

  return `<INTENT>\n${intentSection}\n</INTENT>\n\n<TOPOLOGY>\n${topologySection}\n</TOPOLOGY>\n\n<DIFF>\n${diffSection}\n</DIFF>\n\nProduce a SystemDelta JSON.`;
}

export function analyzeDiff(opts: AnalyzeOptions): SystemDelta {
  const prompt = buildPrompt(opts);
  const model = opts.model || "sonnet";

  if (opts.verbose) {
    console.error("--- PROMPT ---");
    console.error(prompt);
    console.error("--- END PROMPT ---\n");
  }

  const which = spawnSync("which", ["claude"], { encoding: "utf-8" });
  if (which.status !== 0) {
    throw new Error(
      "Claude CLI not found. Install it: https://docs.anthropic.com/en/docs/claude-code"
    );
  }

  const result = spawnSync(
    "claude",
    [
      "-p",
      "--bare",
      "--output-format",
      "json",
      "--model",
      model,
      "--system-prompt",
      SYSTEM_PROMPT,
      "--json-schema",
      JSON.stringify(SYSTEM_DELTA_SCHEMA),
    ],
    {
      input: prompt,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    }
  );

  if (result.error) {
    throw new Error(`Claude CLI error: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Claude CLI exited with code ${result.status}: ${result.stderr}`
    );
  }

  const raw = result.stdout;

  if (opts.verbose) {
    console.error("--- RAW RESPONSE ---");
    console.error(raw);
    console.error("--- END RESPONSE ---\n");
  }

  let delta: SystemDelta;
  try {
    const envelope = JSON.parse(raw);
    if (envelope.structured_output) {
      delta = envelope.structured_output;
    } else if (envelope.result) {
      delta =
        typeof envelope.result === "string"
          ? JSON.parse(envelope.result)
          : envelope.result;
    } else {
      delta = JSON.parse(raw);
    }
  } catch (e: any) {
    throw new Error(
      `Failed to parse Claude response: ${e.message}\nRaw output: ${raw.slice(0, 500)}`
    );
  }

  if (!delta.intent || !Array.isArray(delta.changed)) {
    throw new Error(
      "Claude returned invalid SystemDelta — missing 'intent' or 'changed' field"
    );
  }

  return delta;
}

export { buildPrompt };
