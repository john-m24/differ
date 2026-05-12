# Differ Agent Protocol

When working in this repository, follow this protocol after completing any task.

## What You Must Produce

### 1. `SYSTEM_DELTA.json`

After completing your task, write a `SYSTEM_DELTA.json` file to the repo root describing what changed at the system level.

```json
{
  "intent": "One sentence restatement of the task you were given",
  "intent_satisfied": true,
  "changed": [
    {
      "id": "NodeName",
      "summary": "What this node does now (present tense)",
      "before": "What this node did before your change",
      "structural_changes": [
        "added: functionName()",
        "modified: existingFunction() — what changed",
        "removed: oldFunction()"
      ]
    }
  ],
  "added": ["NewNodeName"],
  "removed": ["DeletedNodeName"],
  "moved": [
    {
      "what": "description of logic/responsibility that moved",
      "from": "SourceNode",
      "to": "DestinationNode"
    }
  ],
  "edges_added": [
    { "from": "A", "to": "B", "type": "calls" }
  ],
  "edges_removed": [
    { "from": "A", "to": "C", "type": "calls" }
  ],
  "blast_radius": ["NodeX", "NodeY"],
  "scope_violations": [],
  "decision_trace": [
    {
      "decision": "What you decided",
      "alternatives": ["Option A you considered", "Option B you considered"],
      "rationale": "Why you chose this path"
    }
  ]
}
```

### 2. Update `topology.json`

If your change adds, removes, or modifies nodes or edges in the system, update `topology.json` to reflect the new state.

```json
{
  "nodes": [
    {
      "id": "UniqueNodeName",
      "type": "service | module | class | function",
      "files": ["src/path/**", "src/specific-file.ts"],
      "description": "One sentence — what this node is responsible for"
    }
  ],
  "edges": [
    {
      "from": "CallerNode",
      "to": "CalleeNode",
      "type": "calls | depends | emits | subscribes",
      "description": "Brief description of the relationship"
    }
  ]
}
```

## Rules

### Node IDs
- Use PascalCase names that describe the component's role (e.g., `ApiGateway`, `AuthService`, `Renderer`)
- Node IDs must be stable — don't rename without updating the delta
- The `files` array uses glob patterns to map the node to its source files

### Edge Types
- `calls` — synchronous invocation (function call, HTTP request)
- `depends` — imports or uses types/data from another node
- `emits` — sends events/messages consumed by another node
- `subscribes` — listens for events/messages from another node

### Blast Radius
- List every node that **calls into** or **depends on** the nodes you changed
- These are the nodes whose behavior could be affected even though you didn't touch them
- Do NOT include nodes you directly changed — those go in `changed`

### Scope Violations
- If you touched files or nodes that were NOT implied by the task, list them here
- "The task said to add validation to the gateway, but I also refactored the error handling in OrderService" → scope violation

### Decision Trace
- For every non-trivial design choice, document what you did, what else you considered, and why
- The rationale should be a reason, not a restatement ("reduces latency" not "because it's better")

### What NOT To Do
- Do not silently touch files outside the task scope without flagging it
- Do not write tests coupled to your implementation choices — test the intent
- Do not introduce new patterns or abstractions without flagging them in scope_violations
- Do not leave the decision trace empty — if you made choices, document them
