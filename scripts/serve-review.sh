#!/bin/bash
# Ensures differ serve is running and prints the review URL.
# Finds an available port if the default (3141) is taken.
# Used by Claude Code hook to surface reviews after changes.

set -e

PIDFILE="/tmp/differ-serve.pid"
DEFAULT_PORT=3141

# Check if already running and responsive
if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  PORT=$(cat /tmp/differ-serve.port 2>/dev/null || echo "$DEFAULT_PORT")
  if kill -0 "$PID" 2>/dev/null; then
    # Process exists, verify it responds
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" | grep -q "200"; then
      echo "Review: http://localhost:${PORT}"
      exit 0
    fi
  fi
  # Stale pidfile
  rm -f "$PIDFILE" /tmp/differ-serve.port
fi

# Find an available port
PORT=$DEFAULT_PORT
while lsof -i :"$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
  if [ "$PORT" -gt 3200 ]; then
    echo "No available port found in range 3141-3200"
    exit 1
  fi
done

# Start differ serve in background
node dist/cli.js serve -p "$PORT" &
SERVE_PID=$!
echo "$SERVE_PID" > "$PIDFILE"
echo "$PORT" > /tmp/differ-serve.port

# Wait briefly for server to start
sleep 0.5

echo "Review: http://localhost:${PORT}"
