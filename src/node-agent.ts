import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { TopologyNode, TopologyEdge, SystemDelta, TimelineEntry } from "./types.js";
import type { NodeDiff } from "./diff.js";

export interface NodeAgentContext {
  node: TopologyNode;
  edges: { incoming: TopologyEdge[]; outgoing: TopologyEdge[] };
  activity: { timestamp: string; linesAdded: number; linesRemoved: number }[];
  diff: NodeDiff | null;
  delta: SystemDelta | null;
}

export function chatWithNodeAgent(
  message: string,
  context: NodeAgentContext
): string {
  const prompt = buildNodePrompt(message, context);

  const result = spawnSync("claude", ["-p", "--model", "sonnet"], {
    input: prompt,
    encoding: "utf-8",
    timeout: 60_000,
    maxBuffer: 5 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    const err = result.stderr || result.error?.message || "Unknown error";
    return `Error: Could not reach Claude. ${err}`;
  }

  return result.stdout.trim();
}

function buildNodePrompt(message: string, ctx: NodeAgentContext): string {
  let prompt = "";

  prompt += `You are an architecture assistant for a codebase. The user is asking about a specific system component (node). Answer concisely and practically. Focus on architectural impact and relationships.\n\n`;

  prompt += `<NODE>\n${JSON.stringify(ctx.node, null, 2)}\n</NODE>\n\n`;

  prompt += `<EDGES>\n`;
  if (ctx.edges.outgoing.length > 0) {
    prompt += `This node depends on / calls:\n`;
    for (const e of ctx.edges.outgoing) {
      prompt += `- ${e.type} ${e.to}${e.description ? `: "${e.description}"` : ""}\n`;
    }
  }
  if (ctx.edges.incoming.length > 0) {
    prompt += `Other nodes that depend on / call this:\n`;
    for (const e of ctx.edges.incoming) {
      prompt += `- ${e.from} ${e.type} this${e.description ? `: "${e.description}"` : ""}\n`;
    }
  }
  if (ctx.edges.outgoing.length === 0 && ctx.edges.incoming.length === 0) {
    prompt += `No edges (isolated node).\n`;
  }
  prompt += `</EDGES>\n\n`;

  if (ctx.activity.length > 0) {
    prompt += `<RECENT_ACTIVITY>\n`;
    for (const a of ctx.activity.slice(-10)) {
      const time = new Date(a.timestamp).toLocaleTimeString();
      prompt += `- ${time}: +${a.linesAdded}/-${a.linesRemoved}\n`;
    }
    prompt += `</RECENT_ACTIVITY>\n\n`;
  }

  if (ctx.diff && ctx.diff.files.length > 0) {
    prompt += `<CURRENT_DIFF>\n`;
    for (const f of ctx.diff.files) {
      const hunks = f.hunks.length > 3000 ? f.hunks.slice(0, 3000) + "\n... (truncated)" : f.hunks;
      prompt += `--- ${f.file} ---\n${hunks}\n\n`;
    }
    prompt += `</CURRENT_DIFF>\n\n`;
  }

  if (ctx.delta) {
    const relevant = {
      intent: ctx.delta.intent,
      changed: ctx.delta.changed.filter((c) => c.id === ctx.node.id),
      blast_radius: ctx.delta.blast_radius,
    };
    prompt += `<SYSTEM_DELTA>\n${JSON.stringify(relevant, null, 2)}\n</SYSTEM_DELTA>\n\n`;
  }

  // If message asks about source, include file contents
  const wantsSource = /source|code|implementation|full file|show me/i.test(message);
  if (wantsSource) {
    prompt += `<SOURCE_FILES>\n`;
    for (const filePath of ctx.node.files) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const truncated = content.length > 10000 ? content.slice(0, 10000) + "\n... (truncated)" : content;
        prompt += `--- ${filePath} ---\n${truncated}\n\n`;
      } catch {
        prompt += `--- ${filePath} --- (not found)\n\n`;
      }
    }
    prompt += `</SOURCE_FILES>\n\n`;
  }

  prompt += `<USER_QUESTION>\n${message}\n</USER_QUESTION>`;

  return prompt;
}
