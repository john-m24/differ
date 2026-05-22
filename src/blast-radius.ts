import type { ReactTopology, ReactNode, ReactEdge } from "./react-ast/types.js";

export interface BlastRadius {
  changed: string[];
  affected: string[];
  affectedRoutes: string[];
  risks: RiskSignal[];
}

export interface RiskSignal {
  kind: "props-changed" | "hook-signature-changed" | "store-shape-changed";
  nodeId: string;
  detail: string;
}

export function computeBlastRadius(
  topology: ReactTopology,
  changedFiles: string[]
): BlastRadius {
  const changedFileSet = new Set(changedFiles);

  // Find nodes whose files changed
  const changed = topology.nodes
    .filter(n => changedFileSet.has(n.filePath))
    .map(n => n.id);

  const changedSet = new Set(changed);

  // Build reverse edge index
  const reverseRenders = new Map<string, string[]>(); // child → parents that render it
  const reverseUsesHook = new Map<string, string[]>(); // hook → callers
  const forwardSubscribes = new Map<string, string[]>(); // store → subscribers
  const forwardConsumesContext = new Map<string, string[]>(); // context → consumers

  for (const edge of topology.edges) {
    if (edge.kind === "renders") {
      if (!reverseRenders.has(edge.to)) reverseRenders.set(edge.to, []);
      reverseRenders.get(edge.to)!.push(edge.from);
    }
    if (edge.kind === "uses-hook") {
      if (!reverseUsesHook.has(edge.to)) reverseUsesHook.set(edge.to, []);
      reverseUsesHook.get(edge.to)!.push(edge.from);
    }
    if (edge.kind === "subscribes") {
      if (!forwardSubscribes.has(edge.to)) forwardSubscribes.set(edge.to, []);
      forwardSubscribes.get(edge.to)!.push(edge.from);
    }
    if (edge.kind === "consumes-context") {
      if (!forwardConsumesContext.has(edge.to)) forwardConsumesContext.set(edge.to, []);
      forwardConsumesContext.get(edge.to)!.push(edge.from);
    }
  }

  // Walk blast radius (2 hops)
  const affected = new Set<string>();

  for (const nodeId of changed) {
    const node = topology.nodes.find(n => n.id === nodeId);
    if (!node) continue;

    // If a component changed, its parents are affected
    const parents = reverseRenders.get(nodeId) ?? [];
    for (const p of parents) {
      if (!changedSet.has(p)) affected.add(p);
      // 2nd hop: grandparents
      for (const gp of reverseRenders.get(p) ?? []) {
        if (!changedSet.has(gp)) affected.add(gp);
      }
    }

    // If a hook changed, its callers are affected
    if (node.kind === "hook") {
      const callers = reverseUsesHook.get(nodeId) ?? [];
      for (const c of callers) {
        if (!changedSet.has(c)) affected.add(c);
      }
    }

    // If a store changed, its subscribers are affected
    if (node.kind === "store") {
      const subscribers = forwardSubscribes.get(nodeId) ?? [];
      for (const s of subscribers) {
        if (!changedSet.has(s)) affected.add(s);
      }
    }

    // If a context changed, its consumers are affected
    if (node.kind === "context") {
      const consumers = forwardConsumesContext.get(nodeId) ?? [];
      for (const c of consumers) {
        if (!changedSet.has(c)) affected.add(c);
      }
    }
  }

  // Find affected routes
  const allAffected = new Set([...changed, ...affected]);
  const affectedRoutes: string[] = [];

  for (const nodeId of allAffected) {
    const node = topology.nodes.find(n => n.id === nodeId);
    if (node?.kind === "page" && node.route) {
      affectedRoutes.push(node.route);
    }
  }

  // Also check: if an affected component is rendered (transitively) by a page
  for (const node of topology.nodes) {
    if (node.kind === "page" && node.route && !allAffected.has(node.id)) {
      if (hasAffectedDescendant(node.id, allAffected, topology.edges)) {
        affectedRoutes.push(node.route);
        affected.add(node.id);
      }
    }
  }

  return {
    changed,
    affected: [...affected],
    affectedRoutes: [...new Set(affectedRoutes)],
    risks: [],
  };
}

function hasAffectedDescendant(
  nodeId: string,
  affected: Set<string>,
  edges: ReactEdge[],
  visited = new Set<string>()
): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);

  for (const edge of edges) {
    if (edge.from === nodeId && edge.kind === "renders") {
      if (affected.has(edge.to)) return true;
      if (hasAffectedDescendant(edge.to, affected, edges, visited)) return true;
    }
  }
  return false;
}
