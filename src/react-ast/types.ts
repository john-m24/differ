export type ReactNodeKind = "page" | "component" | "hook" | "store" | "context";

export interface ReactNode {
  id: string;
  kind: ReactNodeKind;
  name: string;
  filePath: string;
  line: number;
  exported: boolean;
  props?: PropSignature[];
  route?: string;
  storeKeys?: string[];
}

export interface PropSignature {
  name: string;
  type: string;
  optional: boolean;
}

export type ReactEdgeKind = "renders" | "uses-hook" | "subscribes" | "provides";

export interface ReactEdge {
  from: string;
  to: string;
  kind: ReactEdgeKind;
  subscribedKeys?: string[];
}

export interface ReactTopology {
  nodes: ReactNode[];
  edges: ReactEdge[];
}

export interface FileParseResult {
  filePath: string;
  nodes: ReactNode[];
  jsxReferences: { componentId: string; referencedName: string }[];
  hookCalls: { componentId: string; hookName: string; subscribedKeys?: string[] }[];
  contextProviders: { componentId: string; contextName: string }[];
  imports: { localName: string; source: string; importedName: string }[];
}
