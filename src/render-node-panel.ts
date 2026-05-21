export const NODE_PANEL_CSS = `
/* Node Detail Panel — shared between Graph and Timeline views */
.node-panel-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  height: 100vh;
  background: var(--bg);
  border-left: 1px solid var(--border);
  z-index: 1000;
  display: none;
  flex-direction: column;
  overflow: hidden;
  transform: translateX(100%);
  transition: transform 0.2s ease;
}
.node-panel-overlay.open {
  display: flex;
  transform: translateX(0);
}

.node-panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.node-panel-header h2 { font-size: 16px; font-weight: 600; flex: 1; }
.node-panel-type { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: var(--surface); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
.node-panel-close { background: none; border: none; color: var(--text-tertiary); font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
.node-panel-close:hover { background: var(--surface); color: var(--text-primary); }

.node-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.node-panel-section { margin-bottom: 16px; }
.node-panel-section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}
.node-panel-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

.node-panel-edge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-bottom: 3px;
  border-radius: 4px;
  font-size: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.node-panel-edge-type { color: var(--text-tertiary); font-size: 10px; text-transform: uppercase; min-width: 50px; }
.node-panel-edge-target { font-weight: 500; color: var(--text-primary); cursor: pointer; }
.node-panel-edge-target:hover { color: var(--accent-blue); }
.node-panel-edge-desc { color: var(--text-tertiary); font-size: 11px; margin-left: auto; max-width: 180px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }

.node-panel-blast { display: flex; flex-wrap: wrap; gap: 4px; }
.node-panel-blast-item { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #0d0d1a; border: 1px solid #1a1a2d; color: var(--accent-purple); cursor: pointer; }
.node-panel-blast-item:hover { border-color: var(--accent-purple); }

.node-panel-activity-list { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px; }
.node-panel-activity-item { display: flex; gap: 8px; padding: 2px 0; color: var(--text-secondary); }
.node-panel-activity-item .add { color: var(--accent-green); }
.node-panel-activity-item .del { color: var(--accent-red); }

.node-panel-state { font-size: 12px; }
.node-panel-state-dirty { color: var(--accent-yellow); font-weight: 500; }
.node-panel-state-clean { color: var(--text-tertiary); }
.node-panel-files { margin-top: 4px; font-family: monospace; font-size: 11px; color: var(--text-secondary); }

/* Chat section */
.node-panel-chat {
  border-top: 1px solid var(--border);
  padding: 12px 20px;
  flex-shrink: 0;
  max-height: 50%;
  display: flex;
  flex-direction: column;
}
.node-panel-chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 8px;
  max-height: 200px;
}
.node-panel-chat-msg {
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.5;
}
.node-panel-chat-msg.user { color: var(--text-primary); }
.node-panel-chat-msg.user::before { content: "You: "; color: var(--accent-blue); font-weight: 600; }
.node-panel-chat-msg.agent { color: var(--text-secondary); }
.node-panel-chat-msg.agent::before { content: "Agent: "; color: var(--accent-green); font-weight: 600; }
.node-panel-chat-msg.thinking { color: var(--text-tertiary); font-style: italic; }

.node-panel-chat-input {
  display: flex;
  gap: 6px;
}
.node-panel-chat-input input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}
.node-panel-chat-input input:focus { border-color: var(--accent-blue); }
.node-panel-chat-input input::placeholder { color: var(--text-tertiary); }
.node-panel-chat-input button {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
}
.node-panel-chat-input button:hover { border-color: var(--accent-blue); }

.node-panel-empty { color: var(--text-tertiary); font-size: 12px; font-style: italic; }
`;

export const NODE_PANEL_JS = `
(function() {
  // Chat history per node
  const chatHistory = {};

  window.openNodePanel = function(nodeId) {
    const overlay = document.getElementById("node-panel-overlay");
    if (!overlay) return;

    overlay.innerHTML = '<div style="padding:40px;color:var(--text-tertiary)">Loading...</div>';
    overlay.classList.add("open");

    fetch("/api/node/" + encodeURIComponent(nodeId))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          overlay.innerHTML = '<div style="padding:40px;color:var(--accent-red)">' + data.error + '</div>';
          return;
        }
        renderNodePanel(overlay, nodeId, data);
      })
      .catch(err => {
        overlay.innerHTML = '<div style="padding:40px;color:var(--accent-red)">Failed to load node</div>';
      });
  };

  window.closeNodePanel = function() {
    const overlay = document.getElementById("node-panel-overlay");
    if (overlay) overlay.classList.remove("open");
  };

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") closeNodePanel();
  });

  function esc(s) { return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function renderNodePanel(container, nodeId, data) {
    let h = '';

    // Header
    h += '<div class="node-panel-header">';
    h += '<h2>' + esc(data.node.id) + '</h2>';
    if (data.node.type) h += '<span class="node-panel-type">' + esc(data.node.type) + '</span>';
    h += '<button class="node-panel-close" onclick="closeNodePanel()">&times;</button>';
    h += '</div>';

    // Body
    h += '<div class="node-panel-body">';

    // Description
    if (data.node.description) {
      h += '<div class="node-panel-section">';
      h += '<p class="node-panel-desc">' + esc(data.node.description) + '</p>';
      h += '</div>';
    }

    // Dependencies (outgoing)
    if (data.edges.outgoing.length > 0) {
      h += '<div class="node-panel-section">';
      h += '<div class="node-panel-section-title">Dependencies</div>';
      for (const e of data.edges.outgoing) {
        h += '<div class="node-panel-edge">';
        h += '<span class="node-panel-edge-type">' + esc(e.type) + '</span>';
        h += '<span class="node-panel-edge-target" onclick="openNodePanel(\\''+esc(e.to)+'\\')">'+esc(e.to)+'</span>';
        if (e.description) h += '<span class="node-panel-edge-desc" title="'+esc(e.description)+'">' + esc(e.description) + '</span>';
        h += '</div>';
      }
      h += '</div>';
    }

    // Dependents (incoming)
    if (data.edges.incoming.length > 0) {
      h += '<div class="node-panel-section">';
      h += '<div class="node-panel-section-title">Depended on by</div>';
      for (const e of data.edges.incoming) {
        h += '<div class="node-panel-edge">';
        h += '<span class="node-panel-edge-type">' + esc(e.type) + '</span>';
        h += '<span class="node-panel-edge-target" onclick="openNodePanel(\\''+esc(e.from)+'\\')">'+esc(e.from)+'</span>';
        if (e.description) h += '<span class="node-panel-edge-desc" title="'+esc(e.description)+'">' + esc(e.description) + '</span>';
        h += '</div>';
      }
      h += '</div>';
    }

    // Blast radius
    if (data.blastRadius.length > 0) {
      h += '<div class="node-panel-section">';
      h += '<div class="node-panel-section-title">Blast Radius</div>';
      h += '<div class="node-panel-blast">';
      for (const id of data.blastRadius) {
        h += '<span class="node-panel-blast-item" onclick="openNodePanel(\\''+esc(id)+'\\')">'+esc(id)+'</span>';
      }
      h += '</div>';
      h += '</div>';
    }

    // Recent activity
    h += '<div class="node-panel-section">';
    h += '<div class="node-panel-section-title">Recent Activity</div>';
    if (data.activity.entries.length > 0) {
      h += '<div class="node-panel-activity-list">';
      const recent = data.activity.entries.slice(-5);
      for (const a of recent) {
        const t = new Date(a.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
        h += '<div class="node-panel-activity-item"><span>'+t+'</span>';
        if (a.linesAdded > 0) h += '<span class="add">+'+a.linesAdded+'</span>';
        if (a.linesRemoved > 0) h += '<span class="del">-'+a.linesRemoved+'</span>';
        h += '</div>';
      }
      h += '</div>';
    } else {
      h += '<span class="node-panel-empty">No activity this session</span>';
    }
    h += '</div>';

    // Current state
    h += '<div class="node-panel-section">';
    h += '<div class="node-panel-section-title">Current State</div>';
    if (data.currentState.dirty) {
      h += '<div class="node-panel-state"><span class="node-panel-state-dirty">Modified</span>';
      h += ' <span style="font-family:monospace;font-size:11px;color:var(--accent-green)">+' + data.currentState.linesAdded + '</span>';
      h += ' <span style="font-family:monospace;font-size:11px;color:var(--accent-red)">-' + data.currentState.linesRemoved + '</span>';
      h += '</div>';
      h += '<div class="node-panel-files">' + data.currentState.files.map(f => esc(f)).join(', ') + '</div>';
    } else {
      h += '<span class="node-panel-state-clean">Clean (no changes from base)</span>';
    }
    h += '</div>';

    h += '</div>'; // end body

    // Chat
    h += '<div class="node-panel-chat">';
    h += '<div class="node-panel-chat-messages" id="node-chat-messages"></div>';
    h += '<div class="node-panel-chat-input">';
    h += '<input type="text" id="node-chat-input" placeholder="Ask about this node..." />';
    h += '<button onclick="sendNodeChat(\\''+esc(nodeId)+'\\')">Ask</button>';
    h += '</div>';
    h += '</div>';

    container.innerHTML = h;

    // Render existing chat history
    if (chatHistory[nodeId]) {
      const msgContainer = document.getElementById("node-chat-messages");
      for (const msg of chatHistory[nodeId]) {
        appendChatMessage(msgContainer, msg.role, msg.text);
      }
    }

    // Enter to send
    const input = document.getElementById("node-chat-input");
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") sendNodeChat(nodeId);
    });
    input.focus();
  }

  window.sendNodeChat = function(nodeId) {
    const input = document.getElementById("node-chat-input");
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";

    if (!chatHistory[nodeId]) chatHistory[nodeId] = [];
    chatHistory[nodeId].push({ role: "user", text: msg });

    const msgContainer = document.getElementById("node-chat-messages");
    appendChatMessage(msgContainer, "user", msg);
    appendChatMessage(msgContainer, "thinking", "Thinking...");

    fetch("/api/node/" + encodeURIComponent(nodeId) + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    })
      .then(r => r.json())
      .then(data => {
        // Remove thinking indicator
        const thinking = msgContainer.querySelector(".thinking");
        if (thinking) thinking.remove();

        const answer = data.answer || data.error || "No response";
        chatHistory[nodeId].push({ role: "agent", text: answer });
        appendChatMessage(msgContainer, "agent", answer);
      })
      .catch(() => {
        const thinking = msgContainer.querySelector(".thinking");
        if (thinking) thinking.remove();
        appendChatMessage(msgContainer, "agent", "Error: failed to reach agent");
      });
  };

  function appendChatMessage(container, role, text) {
    const div = document.createElement("div");
    div.className = "node-panel-chat-msg " + role;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
})();
`;
