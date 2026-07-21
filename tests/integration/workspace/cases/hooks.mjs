import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function hooks(harness) {
  const { temp, run, spawn } = harness;
  const { hook: hookScript, workspace: workspaceScript } = harness.scripts;

  function runHookWithHostEnvironment(args, input, environment = {}) {
    const env = { ...process.env };
    delete env.PLUGIN_ROOT;
    delete env.PLUGIN_DATA;
    delete env.CLAUDE_PLUGIN_ROOT;
    delete env.CLAUDE_PLUGIN_DATA;
    Object.assign(env, environment);
    return JSON.parse(execFileSync(process.execPath, [hookScript, ...args], {
      cwd: temp,
      encoding: "utf8",
      env,
      input: JSON.stringify(input),
    }));
  }

  const externalProject = path.join(temp, "external-project");
  await mkdir(externalProject, { recursive: true });
  const nonCandidateSession = run(hookScript, ["--provider", "codex", "--mode", "session"], {
    cwd: externalProject,
    session_id: "non-candidate-session",
    hook_event_name: "SessionStart",
  });
  assert.equal(nonCandidateSession.hookSpecificOutput, undefined);
  await assert.rejects(
    readFile(path.join(externalProject, ".agrimap-agent", "runtime", "hooks", "codex-non-candidate-session.json"), "utf8"),
    { code: "ENOENT" },
  );

  for (const prompt of [
    "Explain why agm-analyze exists without activating it",
    "$agm-unknown must not activate an unregistered alias",
  ]) {
    const plainMention = run(hookScript, ["--provider", "codex", "--mode", "task"], {
      cwd: externalProject,
      session_id: `plain-mention-${prompt.length}`,
      hook_event_name: "UserPromptSubmit",
      prompt,
    });
    assert.equal(plainMention.hookSpecificOutput, undefined);
  }

  for (const [provider, hookEventName, prompt] of [
    ["codex", "UserPromptSubmit", "$agm-analyze objective=\"Inspect this external repository\""],
    ["claude", "UserPromptSubmit", "/agrimap-agent-skills:agm-review inspect this external repository"],
    ["gemini", "BeforeAgent", "/agm-plan inspect this external repository"],
  ]) {
    const explicitAlias = run(hookScript, ["--provider", provider, "--mode", "task"], {
      cwd: externalProject,
      session_id: `explicit-${provider}`,
      hook_event_name: hookEventName,
      prompt,
    });
    assert.match(explicitAlias.hookSpecificOutput.additionalContext, /AgriMap: requester is not persisted/);
  }

  const expandedAdapter = run(hookScript, ["--provider", "codex", "--mode", "task"], {
    cwd: externalProject,
    session_id: "expanded-adapter",
    hook_event_name: "UserPromptSubmit",
    prompt: "AGRIMAP_EXPLICIT_ALIAS=agm-analyze\n\nRun only AgriMap operation analyze",
  });
  assert.match(expandedAdapter.hookSpecificOutput.additionalContext, /task, memory, and log attribution/);

  for (const [provider, prompt] of [
    ["codex", "/agm-analyze must not use Gemini syntax"],
    ["codex", "/agrimap-agent-skills:agm-analyze must not use Claude syntax"],
    ["claude", "$agm-analyze must not use Codex syntax"],
    ["claude", "/agm-analyze must not use Gemini syntax"],
    ["gemini", "$agm-analyze must not use Codex syntax"],
    ["gemini", "/agrimap-agent-skills:agm-analyze must not use Claude syntax"],
  ]) {
    const crossProviderSyntax = run(hookScript, ["--provider", provider, "--mode", "task"], {
      cwd: externalProject,
      session_id: `cross-provider-${provider}-${prompt.length}`,
      hook_event_name: "UserPromptSubmit",
      prompt,
    });
    assert.equal(crossProviderSyntax.hookSpecificOutput, undefined);
  }

  run(workspaceScript, [
    "identify", "--cwd", externalProject, "--session", "external-active-task", "--owner", "External Owner",
  ]);
  run(workspaceScript, [
    "start", "--cwd", externalProject, "--session", "external-active-task", "--task", "external-task",
    "--operation", "analyze", "--title", "Continue explicitly activated tracked work",
  ]);
  const activeTaskContinuation = run(hookScript, ["--provider", "codex", "--mode", "session"], {
    cwd: externalProject,
    session_id: "external-active-task",
    hook_event_name: "SessionStart",
  });
  assert.match(activeTaskContinuation.hookSpecificOutput.additionalContext, /Active task: external-task/);
  const stateDirectoryAlone = run(hookScript, ["--provider", "codex", "--mode", "session"], {
    cwd: externalProject,
    session_id: "state-directory-alone",
    hook_event_name: "SessionStart",
  });
  assert.equal(stateDirectoryAlone.hookSpecificOutput, undefined);

  const optedInProject = path.join(temp, "renamed-opt-in");
  await mkdir(path.join(optedInProject, ".agrimap-agent"), { recursive: true });
  await writeFile(
    path.join(optedInProject, ".agrimap-agent", "config.json"),
    `${JSON.stringify({ activation: { auto: true } }, null, 2)}\n`,
    "utf8",
  );
  const optedInHook = run(hookScript, ["--provider", "codex", "--mode", "session"], {
    cwd: optedInProject,
    session_id: "opted-in-project",
    hook_event_name: "SessionStart",
  });
  assert.match(optedInHook.hookSpecificOutput.additionalContext, /AgriMap identity and audit context/);

  const projectCandidatesRoot = path.join(temp, "project-candidates");
  for (const projectName of [
    "agmwa-platform-ng",
    "agmwa-suite-ng",
    "agmwa-pro-ng",
    "agmws-identity-netcore",
    "agmws-data-manaagement-netcore",
    "agmbo-publisher-netcore",
    "agrimap-platform",
    "AgriMap.Platform",
  ]) {
    const projectPath = path.join(projectCandidatesRoot, projectName);
    await mkdir(projectPath, { recursive: true });
    const projectHook = run(hookScript, ["--provider", "codex", "--mode", "session"], {
      cwd: projectPath,
      session_id: `project-${projectName}`,
      hook_event_name: "SessionStart",
    });
    assert.match(projectHook.hookSpecificOutput.additionalContext, /AgriMap identity and audit context/);
  }

  for (const projectName of ["agmwa-platform2-ng", "agmws-data_management-netcore", "ordinary-project"]) {
    const projectPath = path.join(projectCandidatesRoot, projectName);
    await mkdir(projectPath, { recursive: true });
    const rejectedProject = run(hookScript, ["--provider", "codex", "--mode", "session"], {
      cwd: projectPath,
      session_id: `rejected-${projectName}`,
      hook_event_name: "SessionStart",
    });
    assert.equal(rejectedProject.hookSpecificOutput, undefined);
  }

  const renamedCheckout = path.join(projectCandidatesRoot, "renamed-checkout");
  await mkdir(renamedCheckout, { recursive: true });
  execFileSync("git", ["init"], { cwd: renamedCheckout, stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", "git@gitlab.company.local:agrimap/agmwa-platform-ng.git"], { cwd: renamedCheckout });
  const remoteProjectHook = run(hookScript, ["--provider", "codex", "--mode", "session"], {
    cwd: renamedCheckout,
    session_id: "remote-project-name",
    hook_event_name: "SessionStart",
  });
  assert.match(remoteProjectHook.hookSpecificOutput.additionalContext, /AgriMap identity and audit context/);

  const configPath = path.join(temp, ".agrimap-agent", "config.json");
  const activationConfig = JSON.parse(await readFile(configPath, "utf8"));
  activationConfig.activation = { auto: true };
  await writeFile(configPath, `${JSON.stringify(activationConfig, null, 2)}\n`, "utf8");

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
  assert.match(booleanFlagHook.hookSpecificOutput.additionalContext, /Hook provider: gemini/);
  assert.match(booleanFlagHook.hookSpecificOutput.additionalContext, /Hook mode: session/);

  const autoProviderHook = run(hookScript, ["--provider", "auto", "--mode", "session"], {
    cwd: temp,
    session_id: "provider-regression",
    hook_event_name: "SessionStart",
  });
  assert.match(autoProviderHook.hookSpecificOutput.additionalContext, /Hook provider: unknown/);

  const staleClaudeHookInsideCodex = runHookWithHostEnvironment(
    ["--provider", "claude", "--mode", "session"],
    { cwd: temp, session_id: "codex-provider-guard", hook_event_name: "SessionStart" },
    { PLUGIN_ROOT: path.join(temp, "codex-plugin"), CLAUDE_PLUGIN_ROOT: path.join(temp, "codex-plugin") },
  );
  assert.match(staleClaudeHookInsideCodex.hookSpecificOutput.additionalContext, /Hook provider: codex/);
  assert.match(staleClaudeHookInsideCodex.hookSpecificOutput.additionalContext, /Ignored mismatched hook configuration provider=claude/);

  const staleCodexHookInsideClaude = runHookWithHostEnvironment(
    ["--provider", "codex", "--mode", "session"],
    { cwd: temp, session_id: "claude-provider-guard", hook_event_name: "SessionStart" },
    { CLAUDE_PLUGIN_ROOT: path.join(temp, "claude-plugin") },
  );
  assert.match(staleCodexHookInsideClaude.hookSpecificOutput.additionalContext, /Hook provider: claude/);
  assert.match(staleCodexHookInsideClaude.hookSpecificOutput.additionalContext, /Ignored mismatched hook configuration provider=codex/);

  const geminiProviderGuard = runHookWithHostEnvironment(
    ["--provider", "gemini", "--mode", "session"],
    { cwd: temp, session_id: "gemini-provider-guard", hook_event_name: "SessionStart" },
  );
  assert.match(geminiProviderGuard.hookSpecificOutput.additionalContext, /Hook provider: gemini/);
  assert.match(geminiProviderGuard.hookSpecificOutput.additionalContext, /runtime provider agree: gemini/);

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
  assert.doesNotMatch(claudeSessionB.hookSpecificOutput.additionalContext, /Current project memory:/);
  assert.match(claudeSessionB.hookSpecificOutput.additionalContext, /Current tracked-task memory:/);
  assert.match(claudeSessionB.hookSpecificOutput.additionalContext, /Every depth writes concise task artifacts, memory, and logs/);

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
  assert.match(hookUnknown.hookSpecificOutput.additionalContext, /Resolve it before starting the operation/);
  assert.doesNotMatch(hookUnknown.hookSpecificOutput.additionalContext, /Confirmed session requester: Bob/);

  const hookWithModel = run(hookScript, ["--provider", "codex", "--mode", "session"], {
    cwd: temp,
    session_id: "model-aware-session",
    hook_event_name: "SessionStart",
    model: "gpt-5.6",
  });
  assert.match(hookWithModel.hookSpecificOutput.additionalContext, /Host-reported active model: gpt-5\.6/);
  assert.match(hookWithModel.hookSpecificOutput.additionalContext, /Previously recorded execution identity .*model=gpt-5\.6/);
  assert.match(hookWithModel.hookSpecificOutput.additionalContext, /--model "gpt-5\.6" --provider codex/);
  assert.doesNotMatch(hookWithModel.hookSpecificOutput.additionalContext, /model=unknown/);

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
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /Native agent-thread activity is the primary progress channel/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /CLI \/agent/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /only when the handoff explicitly declares a fallback/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /meaningful phase\/status transitions/);
  assert.match(subagentHook.hookSpecificOutput.additionalContext, /never write per step, tool call, file read, or unchanged poll/);
  assert.doesNotMatch(subagentHook.hookSpecificOutput.additionalContext, /one line per ordered step/);
  assert.doesNotMatch(subagentHook.hookSpecificOutput.additionalContext, /First action before any work: append your identity line/);
}
