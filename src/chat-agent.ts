import { execSync } from "node:child_process";
import type { Topology, SystemDelta } from "./types.js";

export interface ProposedChange {
  file: string;
  before: string;
  after: string;
}

export interface ChatResponse {
  explanation: string;
  changes: ProposedChange[];
}

export function chatWithAgent(
  message: string,
  topology: Topology,
  delta: SystemDelta
): ChatResponse {
  const prompt = buildPrompt(message, topology, delta);

  let output: string;
  try {
    output = execSync(`claude -p "${escapeShell(prompt)}"`, {
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024,
      timeout: 60000,
    });
  } catch (e: any) {
    throw new Error(`Claude CLI failed: ${e.message}`);
  }

  return parseResponse(output, topology, delta);
}

function buildPrompt(message: string, topology: Topology, delta: SystemDelta): string {
  return `You are editing a system topology for a code review tool called "differ".

Here is the current topology.json:
${JSON.stringify(topology, null, 2)}

Here is the current SYSTEM_DELTA.json:
${JSON.stringify(delta, null, 2)}

The user wants to: ${message}

Respond with EXACTLY this format:

EXPLANATION: <one sentence explaining what you'll change>

FILE: topology.json
\`\`\`json
<full updated topology.json content, or UNCHANGED if no changes>
\`\`\`

FILE: SYSTEM_DELTA.json
\`\`\`json
<full updated SYSTEM_DELTA.json content, or UNCHANGED if no changes>
\`\`\`

Rules:
- Only modify what the user asked for
- Keep all other fields intact
- If renaming a node, update all references in edges, changed, added, removed, blast_radius, and moved
- Output the FULL file content, not a partial diff`;
}

function escapeShell(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}

function parseResponse(
  output: string,
  currentTopology: Topology,
  currentDelta: SystemDelta
): ChatResponse {
  const explanationMatch = output.match(/EXPLANATION:\s*(.+)/);
  const explanation = explanationMatch?.[1]?.trim() || "Changes proposed";

  const changes: ProposedChange[] = [];

  const fileBlocks = output.split(/FILE:\s*/);
  for (const block of fileBlocks.slice(1)) {
    const lines = block.trim().split("\n");
    const fileName = lines[0]?.trim();
    if (!fileName) continue;

    const jsonMatch = block.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) continue;

    const content = jsonMatch[1].trim();
    if (content === "UNCHANGED") continue;

    try {
      JSON.parse(content);
    } catch {
      continue;
    }

    let before = "";
    if (fileName === "topology.json") {
      before = JSON.stringify(currentTopology, null, 2);
    } else if (fileName === "SYSTEM_DELTA.json") {
      before = JSON.stringify(currentDelta, null, 2);
    }

    changes.push({ file: fileName, before, after: content });
  }

  return { explanation, changes };
}
