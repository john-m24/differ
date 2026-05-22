import React from "react";
import { DATA, getNodeById, getNodeEdges, getNodeStatus } from "../state.js";
import type { ReactNode } from "../types.js";

export function NodeDetail({ nodeId }: { nodeId: string }) {
  const node = getNodeById(nodeId);
  if (!node) return <div className="node-detail-empty">Node not found</div>;

  const edges = getNodeEdges(nodeId);
  const status = getNodeStatus(nodeId);

  return (
    <div className="node-detail">
      <div className="node-detail-header">
        <span className={"node-detail-kind " + node.kind}>{node.kind}</span>
        <span className="node-detail-name">{node.name}</span>
        {node.route && <span className="node-detail-route">{node.route}</span>}
        {status !== "unchanged" && (
          <span className={"node-detail-status " + status}>{status}</span>
        )}
      </div>

      <div className="node-detail-file">{node.filePath}:{node.line}</div>

      {node.kind === "component" || node.kind === "page" ? (
        <ComponentDetail node={node} edges={edges} />
      ) : node.kind === "hook" ? (
        <HookDetail node={node} edges={edges} />
      ) : node.kind === "store" ? (
        <StoreDetail node={node} edges={edges} />
      ) : node.kind === "context" ? (
        <ContextDetail node={node} edges={edges} />
      ) : null}
    </div>
  );
}

function ComponentDetail({ node, edges }: { node: ReactNode; edges: ReturnType<typeof getNodeEdges> }) {
  return (
    <div className="node-detail-sections">
      {node.props && node.props.length > 0 && (
        <Section title="Props">
          {node.props.map(p => (
            <div key={p.name} className="node-detail-prop">
              <span className="prop-name">{p.name}</span>
              {p.optional && <span className="prop-optional">?</span>}
              <span className="prop-type">{p.type}</span>
            </div>
          ))}
        </Section>
      )}

      {edges.renderedBy.length > 0 && (
        <Section title="Rendered by">
          {edges.renderedBy.map(e => (
            <NodeLink key={e.from} id={e.from} />
          ))}
        </Section>
      )}

      {edges.renders.length > 0 && (
        <Section title="Renders">
          {edges.renders.map(e => (
            <NodeLink key={e.to} id={e.to} />
          ))}
        </Section>
      )}

      {edges.usesHooks.length > 0 && (
        <Section title="Hooks">
          {edges.usesHooks.map(e => (
            <NodeLink key={e.to} id={e.to} />
          ))}
        </Section>
      )}

      {edges.subscribesTo.length > 0 && (
        <Section title="Subscribes to">
          {edges.subscribesTo.map(e => (
            <div key={e.to} className="node-detail-subscription">
              <NodeLink id={e.to} />
              {e.subscribedKeys && (
                <span className="subscribed-keys">{e.subscribedKeys.join(", ")}</span>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function HookDetail({ node, edges }: { node: ReactNode; edges: ReturnType<typeof getNodeEdges> }) {
  return (
    <div className="node-detail-sections">
      {edges.calledBy.length > 0 && (
        <Section title="Called by">
          {edges.calledBy.map(e => (
            <NodeLink key={e.from} id={e.from} />
          ))}
        </Section>
      )}

      {edges.subscribesTo.length > 0 && (
        <Section title="Reads from">
          {edges.subscribesTo.map(e => (
            <NodeLink key={e.to} id={e.to} />
          ))}
        </Section>
      )}
    </div>
  );
}

function StoreDetail({ node, edges }: { node: ReactNode; edges: ReturnType<typeof getNodeEdges> }) {
  return (
    <div className="node-detail-sections">
      {node.storeKeys && node.storeKeys.length > 0 && (
        <Section title="State shape">
          {node.storeKeys.map(key => (
            <div key={key} className="node-detail-store-key">{key}</div>
          ))}
        </Section>
      )}

      {edges.subscribers.length > 0 && (
        <Section title={`Subscribers (${edges.subscribers.length})`}>
          {edges.subscribers.map(e => (
            <div key={e.from} className="node-detail-subscription">
              <NodeLink id={e.from} />
              {e.subscribedKeys && (
                <span className="subscribed-keys">{e.subscribedKeys.join(", ")}</span>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function ContextDetail({ node, edges }: { node: ReactNode; edges: ReturnType<typeof getNodeEdges> }) {
  return (
    <div className="node-detail-sections">
      {edges.provides.length > 0 && (
        <Section title="Provided by">
          {edges.provides.map(e => (
            <NodeLink key={e.from} id={e.from} />
          ))}
        </Section>
      )}

      {edges.subscribers.length > 0 && (
        <Section title="Consumed by">
          {edges.subscribers.map(e => (
            <NodeLink key={e.from} id={e.from} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="node-detail-section">
      <div className="node-detail-section-title">{title}</div>
      {children}
    </div>
  );
}

function NodeLink({ id }: { id: string }) {
  const node = getNodeById(id);
  const status = getNodeStatus(id);
  if (!node) return <div className="node-link">{id}</div>;
  return (
    <div className={"node-link " + status}>
      <span className={"node-link-kind " + node.kind}>{node.kind[0]}</span>
      <span className="node-link-name">{node.name}</span>
    </div>
  );
}
