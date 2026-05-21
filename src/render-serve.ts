import type { Topology, SystemDelta, CommitInfo } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { renderReview } from "./render.js";

export function renderServeView(topology: Topology, delta: SystemDelta, nodeDiffs?: NodeDiff[], commits?: CommitInfo[]): string {
  const base = renderReview(topology, delta, nodeDiffs, commits);

  // Inject chat panel and live-reload script before closing </body>
  const injection = `
<div id="chat-panel">
  <div id="chat-header">
    <span>Edit Topology</span>
    <button id="chat-toggle" onclick="document.getElementById('chat-panel').classList.toggle('collapsed')">_</button>
  </div>
  <div id="chat-messages"></div>
  <div id="chat-input-area">
    <input type="text" id="chat-input" placeholder="e.g. Rename Init to Initializer..." />
    <button id="chat-send" onclick="sendMessage()">Send</button>
  </div>
</div>
<style>
${CHAT_CSS}
</style>
<script>
${CHAT_SCRIPT}
</script>`;

  return base.replace("</body>", injection + "\n</body>");
}

const CHAT_CSS = `
#chat-panel {
  position: fixed;
  bottom: 0;
  right: 16px;
  width: 400px;
  max-height: 500px;
  background: #161b22;
  border: 1px solid #21262d;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
}
#chat-panel.collapsed #chat-messages,
#chat-panel.collapsed #chat-input-area { display: none; }
#chat-panel.collapsed { max-height: 36px; }
#chat-header {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #21262d;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #f0f6fc;
}
#chat-header button {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 16px;
}
#chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  max-height: 350px;
  min-height: 100px;
}
.chat-msg {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.4;
}
.chat-msg.user {
  color: #c9d1d9;
  padding: 6px 10px;
  background: #21262d;
  border-radius: 6px;
}
.chat-msg.agent {
  color: #8b949e;
}
.chat-msg.agent .explanation {
  color: #c9d1d9;
  margin-bottom: 8px;
}
.chat-preview {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
  font-family: monospace;
  font-size: 11px;
  max-height: 150px;
  overflow-y: auto;
}
.chat-preview .file-name {
  color: #6fdd8b;
  margin-bottom: 4px;
  font-weight: bold;
}
.chat-preview .diff-line-add { color: #6fdd8b; }
.chat-preview .diff-line-del { color: #f85149; }
.chat-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.chat-actions button {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid #21262d;
  font-size: 12px;
  cursor: pointer;
}
.chat-actions .confirm {
  background: #1b4332;
  color: #6fdd8b;
  border-color: #6fdd8b;
}
.chat-actions .reject {
  background: #21262d;
  color: #8b949e;
}
.chat-actions .confirm:hover { background: #22543d; }
.chat-actions .reject:hover { background: #30363d; }
.chat-loading {
  color: #8b949e;
  font-style: italic;
  font-size: 12px;
}
#chat-input-area {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #21262d;
}
#chat-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 6px 10px;
  color: #c9d1d9;
  font-size: 13px;
  outline: none;
}
#chat-input:focus { border-color: #388bfd; }
#chat-send {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
#chat-send:hover { background: #30363d; }
#chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const CHAT_SCRIPT = `
(function() {
  // Live reload via SSE
  const evtSource = new EventSource("/api/events");
  evtSource.onmessage = function() {
    window.location.reload();
  };

  // Chat state
  let pendingChanges = null;

  window.sendMessage = async function() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    addMessage(message, "user");
    addLoading();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      removeLoading();

      if (data.error) {
        addMessage("Error: " + data.error, "agent");
        return;
      }

      if (data.changes.length === 0) {
        addMessage(data.explanation + " (no changes needed)", "agent");
        return;
      }

      pendingChanges = data.changes;
      showProposal(data.explanation, data.changes);
    } catch (e) {
      removeLoading();
      addMessage("Error: " + e.message, "agent");
    }
  };

  window.confirmChanges = async function() {
    if (!pendingChanges) return;

    try {
      await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: pendingChanges })
      });
      pendingChanges = null;
      // SSE will trigger reload
    } catch (e) {
      addMessage("Error applying: " + e.message, "agent");
    }
  };

  window.rejectChanges = function() {
    pendingChanges = null;
    addMessage("Changes rejected.", "agent");
  };

  function addMessage(text, role) {
    const messages = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "chat-msg " + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addLoading() {
    const messages = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "chat-loading";
    div.id = "chat-loading-indicator";
    div.textContent = "Thinking...";
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    document.getElementById("chat-send").disabled = true;
  }

  function removeLoading() {
    const el = document.getElementById("chat-loading-indicator");
    if (el) el.remove();
    document.getElementById("chat-send").disabled = false;
  }

  function showProposal(explanation, changes) {
    const messages = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "chat-msg agent";

    let html = '<div class="explanation">' + escapeHtml(explanation) + '</div>';

    changes.forEach(function(change) {
      html += '<div class="chat-preview">';
      html += '<div class="file-name">' + escapeHtml(change.file) + '</div>';

      // Simple line-by-line diff
      const beforeLines = change.before.split("\\n");
      const afterLines = change.after.split("\\n");
      const maxLines = Math.min(20, Math.max(beforeLines.length, afterLines.length));

      for (let i = 0; i < maxLines; i++) {
        if (beforeLines[i] !== afterLines[i]) {
          if (beforeLines[i] !== undefined && !afterLines.includes(beforeLines[i])) {
            html += '<div class="diff-line-del">- ' + escapeHtml(beforeLines[i]) + '</div>';
          }
          if (afterLines[i] !== undefined && !beforeLines.includes(afterLines[i])) {
            html += '<div class="diff-line-add">+ ' + escapeHtml(afterLines[i]) + '</div>';
          }
        }
      }
      if (afterLines.length > 20) {
        html += '<div style="color:#484f58">... (' + (afterLines.length - 20) + ' more lines)</div>';
      }
      html += '</div>';
    });

    html += '<div class="chat-actions">';
    html += '<button class="confirm" onclick="confirmChanges()">Apply</button>';
    html += '<button class="reject" onclick="rejectChanges()">Reject</button>';
    html += '</div>';

    div.innerHTML = html;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Enter key to send
  document.getElementById("chat-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      window.sendMessage();
    }
  });
})();
`;
