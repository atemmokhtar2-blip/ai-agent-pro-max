#!/usr/bin/env python3
"""Apply the chat-disappearance fix to PlannerWorkspace.tsx."""

import re

FILE = "artifacts/ai-agent/src/components/PlannerWorkspace.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ── Fix 1: Insert a useEffect that resets the phase when conversationId changes ──
# Insert it right BEFORE the "Document title" useEffect block.
# The "Document title" block starts with the comment line then:
#   useEffect(() => {
#     const base = "AI Agent";

reset_block = '''  // ── Reset phase when switching conversations ─────────────────────────────
  // CRITICAL FIX: When the user switches to a different conversation, the
  // phase state (e.g. done_conversation, done_blueprint, executing) and
  // priorMessageCountRef from the PREVIOUS conversation persist.  This causes
  // renderHistory() to slice messages using a stale limit, making the chat
  // appear empty or partially hidden ("chat disappearance" bug).
  // We reset everything to a clean idle state whenever conversationId changes.

  useEffect(() => {
    // Abort any in-flight streams from the previous conversation
    abortRef.current?.abort();
    execAbortRef.current?.abort();
    if (flushRafRef.current !== null) {
      cancelAnimationFrame(flushRafRef.current);
      flushRafRef.current = null;
    }
    pendingTokensRef.current = "";

    // Reset all phase-related state to a clean idle state
    setPhase({ kind: "idle" });
    setIsStreaming(false);
    setStreamingContent("");
    setStreamingStage(null);
    setThinkingText("");
    setThinkingModel("");
    setThinkingStreaming(false);
    setActiveModelSwitch(null);
    setShowScrollBtn(false);
    setExecActive(false);
    setExecCurrentStage(undefined);
    setExecLogs([]);

    // Sync priorMessageCountRef to the new conversation's message count so
    // renderHistory() shows the full history immediately.
    priorMessageCountRef.current = messages.length;
    blueprintRef.current = "";
    userScrolledRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

'''

# Find the "Document title" comment line (starts with "  // ── Document title")
# The box-drawing chars are U+2500.  Match the comment that contains "Document title".
doc_title_comment_re = re.compile(r'  // [^\n]*Document title[^\n]*\n')
m = doc_title_comment_re.search(content)
if not m:
    raise SystemExit("Could not find Document title comment")
insert_at = m.start()

# Check we haven't already inserted it (idempotency)
if "Reset phase when switching conversations" in content:
    print("Fix 1 already present — skipping insertion.")
else:
    content = content[:insert_at] + reset_block + content[insert_at:]
    print(f"Fix 1 inserted at offset {insert_at}")

# ── Fix 2: Make renderHistory() more robust ──
# Replace the brittle:
#   const limit = phase.kind === "idle" ? messages.length : priorMessageCountRef.current;
#   const visible = messages.slice(0, limit);
# with a version that also shows the full history when the phase is a "done"
# state (done_conversation / done_blueprint / verified / error) AND the DB has
# already been refreshed (messages.length > priorMessageCountRef.current).
# This prevents the assistant reply from being hidden after the DB refresh.

old_render = '    const limit = phase.kind === "idle" ? messages.length : priorMessageCountRef.current;\n    const visible = messages.slice(0, limit);\n'

new_render = '''    // When idle, show the full message history from the DB.
    // During active streaming / executing, only show history up to the count
    // captured before the current request started (priorMessageCountRef) — the
    // new user message + assistant reply are rendered by renderPhase() instead.
    // BUT once a "done" or "error" phase is reached, the DB has been refreshed
    // (queryClient.invalidateQueries) so messages already contains the new
    // exchange.  In that case show the full history to avoid the reply
    // disappearing after the SSE stream closes.
    const isLivePhase =
      phase.kind === "streaming" ||
      phase.kind === "executing" ||
      phase.kind === "verifying";
    const limit = isLivePhase ? priorMessageCountRef.current : messages.length;
    const visible = messages.slice(0, Math.max(0, limit));
'''

if old_render not in content:
    # already applied?
    if "isLivePhase" in content:
        print("Fix 2 already present — skipping.")
    else:
        raise SystemExit("Could not find renderHistory limit line")
else:
    content = content.replace(old_render, new_render, 1)
    print("Fix 2 applied to renderHistory()")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. File updated successfully.")
