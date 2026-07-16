import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";

export async function hooks(harness) {
  const { temp, run, spawn } = harness;
  const { hook: hookScript, workspace: workspaceScript } = harness.scripts;

  const hookA = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.equal(hookA.continue, true);
  assert.equal(hookA.suppressOutput, true);
  assert.equal(hookA.hookSpecificOutput, undefined);

  const booleanFlagHook = run(hookScript, ["--debug", "--provider", "gemini", "--mode", "session"], {
    cwd: temp,
    session_id: "parser-regression",
    hook_event_name: "BeforeAgent",
  });
  assert.match(booleanFlagHook.hookSpecificOutput.additionalContext, /Hook flavor: gemini/);
  assert.match(booleanFlagHook.hookSpecificOutput.additionalContext, /Hook mode: session/);

  const autoProviderHook = run(hookScript, ["--provider", "auto", "--mode", "session"], {
    cwd: temp,
    session_id: "provider-regression",
    hook_event_name: "SessionStart",
  });
  assert.match(autoProviderHook.hookSpecificOutput.additionalContext, /Hook flavor: unknown/);

  const repeatedHookA = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.equal(repeatedHookA.hookSpecificOutput, undefined);

  await writeFile(path.join(temp, ".agrimap-agent", "memory", "project.md"), "# Project memory\n\n- Audit history must remain queryable.\n", "utf8");
  const changedProjectMemoryHook = run(hookScript, ["--provider", "gemini", "--mode", "task"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "BeforeAgent",
  });
  assert.match(changedProjectMemoryHook.hookSpecificOutput.additionalContext, /task\/project memory changed on disk since the last refresh/);
  assert.doesNotMatch(changedProjectMemoryHook.hookSpecificOutput.additionalContext, /Audit history must remain queryable/);

  const claudeSessionB = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "SessionStart",
  });
  assert.match(claudeSessionB.hookSpecificOutput.additionalContext, /Current project memory:/);
  assert.match(claudeSessionB.hookSpecificOutput.additionalContext, /Current task memory \(pending work to reconcile\):/);

  const unchangedClaudePrompt = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "UserPromptSubmit",
    prompt: "Continue the task",
  });
  assert.equal(unchangedClaudePrompt.hookSpecificOutput, undefined);

  run(workspaceScript, ["checkpoint", "--cwd", temp, "--session", "session-b", "--task", "task-b", "--summary", "Task B context changed", "--event", "verified"]);
  const refreshedClaudePrompt = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "UserPromptSubmit",
    prompt: "Continue after the checkpoint",
  });
  assert.match(refreshedClaudePrompt.hookSpecificOutput.additionalContext, /task\/project memory changed on disk since the last refresh/);
  assert.doesNotMatch(refreshedClaudePrompt.hookSpecificOutput.additionalContext, /Task B context changed/);

  const repeatedClaudePrompt = run(hookScript, ["--provider", "claude", "--mode", "task"], {
    cwd: temp,
    session_id: "session-b",
    hook_event_name: "UserPromptSubmit",
    prompt: "Continue again",
  });
  assert.equal(repeatedClaudePrompt.hookSpecificOutput, undefined);

  const hookUnknown = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "new-session",
    hook_event_name: "SessionStart",
  });
  assert.match(hookUnknown.hookSpecificOutput.additionalContext, /Session requester is unknown/);
  assert.doesNotMatch(hookUnknown.hookSpecificOutput.additionalContext, /Confirmed session requester: Bob/);

  run(workspaceScript, ["identify", "--cwd", temp, "--session", "transcript-fallback.jsonl", "--owner", "Carol", "--provider", "gemini"]);
  const transcriptFallbackHook = run(hookScript, ["--provider", "gemini", "--mode", "session"], {
    cwd: temp,
    transcript_path: path.join(temp, "transcript-fallback.jsonl"),
    hook_event_name: "BeforeAgent",
  });
  assert.match(transcriptFallbackHook.hookSpecificOutput.additionalContext, /Session: transcript-fallback\.jsonl \(derived from transcript path\)/);
  assert.match(transcriptFallbackHook.hookSpecificOutput.additionalContext, /Confirmed session requester: Carol/);

  const expiredIdentityResult = run(workspaceScript, ["identify", "--cwd", temp, "--session", "expired-session", "--owner", "Dana"]);
  await writeFile(
    path.join(temp, ".agrimap-agent", "runtime", "sessions", "expired-session.json"),
    `${JSON.stringify({ ...expiredIdentityResult.identity, confirmedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-01-02T00:00:00.000Z" }, null, 2)}\n`,
    "utf8",
  );
  const expiredStart = spawn(workspaceScript, [
    "start", "--cwd", temp, "--session", "expired-session", "--task", "expired-task", "--title", "Must reconfirm requester",
  ]);
  assert.equal(expiredStart.status, 1);
  assert.equal(JSON.parse(expiredStart.stdout).identityExpired, true);

  await writeFile(
    path.join(temp, ".agrimap-agent", "runtime", "sessions", "legacy-session.json"),
    `${JSON.stringify({ requestedBy: "Eve", actor: "legacy-model", role: "leader", provider: "claude", updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  const legacyHook = run(hookScript, ["--provider", "claude", "--mode", "session"], {
    cwd: temp,
    session_id: "legacy-session",
    hook_event_name: "UserPromptSubmit",
  });
  assert.match(legacyHook.hookSpecificOutput.additionalContext, /Confirmed session requester: Eve/);
  assert.match(legacyHook.hookSpecificOutput.additionalContext, /model=legacy-model/);

  const subagentHook = run(hookScript, ["--provider", "claude", "--mode", "subagent"], {
    cwd: temp,
    session_id: "session-a",
    hook_event_name: "SubagentStart",
  });
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /One writer owns them per integration wave/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /integration artifact/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /Read workspace_need before any write/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /base commit/);
}
